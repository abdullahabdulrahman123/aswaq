import { Prisma, type Order } from '@prisma/client';
import { prisma } from '../config/db.js';
import { flowOf, invoiceStageOf, reachesInvoice } from './orderFlow.js';

/**
 * الجدول الحاكم (transactions، مكالمة ٧ أكتوبر) — اللي بيكتب فيه من ناحية الأوردرات: الأوردر
 * لما يبقى فاتورة (رسالة العميل ٨ أكتوبر: draft ← order ← invoice، مع المرحلة اللي النشاط
 * اختارها). الكتابة هنا في نفس العملية مع الأوردر — «يا كله يا مفيش». والفاتورة بعدها
 * مبتتعدّلش ولا بتتلغي («احنا مش هنخترع محاسبة جديدة») — التصحيح «مردود بيع» بعدين.
 */
type Tx = Prisma.TransactionClient;
type Person = { acc: string; name: string };

/** الفاتورة دي داخلة الجدول؟ (حركات البيع أكتر من العكسية — العكسية من قبل ٨ أكتوبر) */
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

/**
 * رقم الفاتورة الجاي (مكالمة ٨ أكتوبر: مسلسل للفواتير لوحده) — جوه نفس العملية اللي الطلب
 * بيبقى فيها فاتورة، فلو العملية وقفت العدّاد بيرجع معاها: مسلسل متصل من غير فجوات عشان
 * قفل اليوم مع التحصيلات
 */
export async function nextInvoiceNumber(tx: Tx, sellerAcc: string): Promise<number> {
  const id = `sale-invoice:${sellerAcc}`;
  const { seq } = await tx.counter.upsert({ where: { id }, create: { id, seq: 1 }, update: { seq: { increment: 1 } } });
  return seq;
}

/** الأوردر بقى فاتورة — حركته بتدخل لو لسه مدخلتش */
export async function recordSale(tx: Tx, order: Order, creator: Person) {
  if (!(await saleRecorded(tx, order.id))) await tx.transaction.create({ data: saleOf(order, creator) });
}

/**
 * الأوردرات اللي قبل خانة kind (٨ أكتوبر) — مرة واحدة ساعة ما السيرفر يقوم: المسودة draft،
 * واللي وصل مرحلة الفاتورة عند نشاطه invoice (وحركته في الجدول الحاكم لو مكانتش دخلت، بتاريخ
 * «إتمام»)، والباقي order — ومنه الملغي. updatedAt زي ما هو عشان ترتيب الليستات ميتلخبطش.
 */
export async function backfillInvoices(): Promise<number> {
  await prisma.$runCommandRaw({ update: 'orders', updates: [{ q: { state: 'draft', kind: null }, u: { $set: { kind: 'draft' } }, multi: true }] });
  const pending = await prisma.order.findMany({
    where: { state: { not: 'draft' }, OR: [{ kind: null }, { kind: { isSet: false } }] },
    select: { id: true, state: true, from: true },
  });
  const sellers = [...new Set(pending.map((o) => o.from.acc))];
  const settings = sellers.length ? await prisma.businessSettings.findMany({ where: { businessId: { in: sellers } } }) : [];
  const flows = new Map(settings.map((s) => [s.businessId, { flow: flowOf(s.salesStages), invoiceStage: invoiceStageOf(s.salesStages, s.invoiceStage) }]));
  const plain = { flow: flowOf([]), invoiceStage: 'done' };

  let invoices = 0;
  for (const o of pending) {
    const { flow, invoiceStage } = flows.get(o.from.acc) ?? plain;
    if (!reachesInvoice(flow, o.state, invoiceStage)) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: o.id } });
        if (!order || order.kind) return;
        await tx.order.update({ where: { id: o.id }, data: { kind: 'invoice', updatedAt: order.updatedAt } });
        if (!(await saleRecorded(tx, o.id))) {
          await tx.transaction.create({ data: { ...saleOf(order, order.editor ?? order.creator), createdAt: order.completedAt ?? order.updatedAt } });
        }
        invoices++;
      });
    } catch (err) {
      if (!isWriteConflict(err)) throw err;
    }
  }
  await prisma.$runCommandRaw({ update: 'orders', updates: [{ q: { state: { $ne: 'draft' }, kind: null }, u: { $set: { kind: 'order' } }, multi: true }] });
  return invoices;
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
