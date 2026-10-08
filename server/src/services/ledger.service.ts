import { Prisma, type Order } from '@prisma/client';
import { prisma } from '../config/db.js';

/**
 * الجدول الحاكم (transactions، مكالمة ٧ أكتوبر) — اللي بيكتب فيه: فاتورة البيع لما العميل
 * يستلمها، والتحصيل، والعكس لما فاتورة دخلت تتلغي أو تتعدّل. كل كتابة هنا في نفس
 * العملية مع الجدول التاني (الأوردر أو المعاملة المالية) — «يا كله يا مفيش».
 */
type Tx = Prisma.TransactionClient;
type Person = { acc: string; name: string };

/**
 * الفاتورة بتدخل لما العميل يستلمها: «تسليم» لو النشاط مفعّلها، وإلا «إتمام». اللي
 * يوصل الأول فيهم — والتاني مبيكتبش تاني.
 */
export const RECEIVED_STATES = ['delivered', 'done'];

/** الفاتورة دي داخلة الجدول دلوقتي؟ (حركات البيع أكتر من العكسية) */
async function saleRecorded(tx: Tx, orderId: string): Promise<boolean> {
  const entries = await tx.transaction.findMany({ where: { source: 'order', ref: orderId }, select: { kind: true } });
  return entries.filter((e) => e.kind === 'sale').length > entries.filter((e) => e.kind === 'reversal').length;
}

/** من البائع (متجره) للعميل بإجمالي الفاتورة */
const saleOf = (order: Order, creator: Person) => ({
  kind: 'sale',
  from: { acc: order.from.acc, subAcc: order.from.subAcc ?? null },
  to: { acc: order.to.acc, subAcc: order.to.subAcc ?? null },
  amount: order.netTotal,
  source: 'order',
  ref: order.id,
  creator,
});

/** نفس الفاتورة بالعكس — بقيمتها وأطرافها ساعة ما دخلت */
const reversalOf = (order: Order, creator: Person) => ({
  ...saleOf(order, creator),
  kind: 'reversal',
  from: { acc: order.to.acc, subAcc: order.to.subAcc ?? null },
  to: { acc: order.from.acc, subAcc: order.from.subAcc ?? null },
});

/** الفاتورة وصلت مرحلة الاستلام — بتدخل لو لسه مدخلتش */
export async function recordSaleIfReceived(tx: Tx, order: Order, creator: Person) {
  if (!RECEIVED_STATES.includes(order.state) || (await saleRecorded(tx, order.id))) return;
  await tx.transaction.create({ data: saleOf(order, creator) });
}

/** الفاتورة اتلغت — لو كانت دخلت، بتطلع بحركة بالعكس */
export async function reverseSale(tx: Tx, order: Order, creator: Person) {
  if (await saleRecorded(tx, order.id)) await tx.transaction.create({ data: reversalOf(order, creator) });
}

/**
 * فاتورة دخلت واتعدّلت (كمية أو سعر أو العميل نفسه) — القديمة بالعكس والجديدة sale،
 * عشان الجدول يفضل بيقول الحقيقة من غير ما حركة تتمسح
 */
export async function resyncSale(tx: Tx, before: Order, after: Order, creator: Person) {
  if (before.netTotal === after.netTotal && before.to.acc === after.to.acc) return;
  if (!(await saleRecorded(tx, before.id))) return;
  await tx.transaction.create({ data: reversalOf(before, creator) });
  await tx.transaction.create({ data: saleOf(after, creator) });
}

/**
 * الفواتير اللي العميل استلمها قبل الجدول الحاكم (قبل ٧ أكتوبر) — بتدخل مرة واحدة ساعة ما
 * السيرفر يقوم، بتاريخ «إتمام» (وإلا آخر تعديل)، عشان التحصيل عليها ميطلّعش العميل دافع
 * من غير فاتورة. اللي دخلت قبل كده مبتتكررش.
 */
export async function backfillSaleEntries(): Promise<number> {
  const received = await prisma.order.findMany({ where: { state: { in: RECEIVED_STATES } }, select: { id: true } });
  if (!received.length) return 0;
  const seen = await prisma.transaction.findMany({ where: { source: 'order', ref: { in: received.map((o) => o.id) } }, select: { ref: true } });
  const recorded = new Set(seen.map((t) => t.ref));
  let added = 0;
  for (const { id } of received) {
    if (recorded.has(id)) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (!order || !RECEIVED_STATES.includes(order.state) || (await saleRecorded(tx, id))) return;
        await tx.transaction.create({ data: { ...saleOf(order, order.editor ?? order.creator), createdAt: order.completedAt ?? order.updatedAt } });
        added++;
      });
    } catch (err) {
      if (!isWriteConflict(err)) throw err;
    }
  }
  return added;
}

/** نفس المستند اتكتب من عمليتين في نفس اللحظة — مونجو بيوقّف واحدة (P2034) */
export const isWriteConflict = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';

/** رصيد كل حساب فرعي من الحركات: اللي دخله − اللي طلع منه */
export async function movementOf(subAccs: string[]): Promise<Map<string, number>> {
  const totals = new Map(subAccs.map((id) => [id, 0]));
  if (!subAccs.length) return totals;
  const entries = await prisma.transaction.findMany({
    where: { OR: [{ to: { is: { subAcc: { in: subAccs } } } }, { from: { is: { subAcc: { in: subAccs } } } }] },
    select: { from: true, to: true, amount: true },
  });
  for (const e of entries) {
    if (e.to.subAcc && totals.has(e.to.subAcc)) totals.set(e.to.subAcc, totals.get(e.to.subAcc)! + e.amount);
    if (e.from.subAcc && totals.has(e.from.subAcc)) totals.set(e.from.subAcc, totals.get(e.from.subAcc)! - e.amount);
  }
  return totals;
}
