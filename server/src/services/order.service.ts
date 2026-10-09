import type { Item, Order, OrderDetail, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import type { DraftInput, LineInput } from '../schemas/order.schema.js';
import { isWriteConflict, nextInvoiceNumber, recordSale } from './ledger.service.js';
import { CLOSED_STATES } from './orderFlow.js';

type PriceField = 'onSWP' | 'onSRP' | 'onLWP' | 'onLRP';

/**
 * نفس قاعدة الواجهة (lib/itemUnits.ts): النشاط جملة والفرد قطاعي. «مبيعات» (فاتورة بيحررها
 * البائع في المحل) بأسعار المحل، والمعرض بأسعار الأونلاين — والاستلام والتوصيل مبيغيّروش
 * السعر، بطلب العميل (٢٨ سبتمبر): التوصيل تكلفته خطوة لوحدها بعد التأكيد.
 */
export function priceFieldFor(sale: boolean, buyerKind: 'user' | 'business'): PriceField {
  const wholesale = buyerKind === 'business';
  if (sale) return wholesale ? 'onSWP' : 'onSRP';
  return wholesale ? 'onLWP' : 'onLRP';
}

/** سطر واحد من وحدة صنف — الأسعار من المتجر، والإجماليات بالسكيمة اللي العميل بعتها */
/**
 * soldPrice: السعر اللي البائع كتبه في «مبيعات» (مكالمة ٢٨ سبتمبر — مؤقتاً عشان المصنع يشتغل، بيبيعوا لكل
 * عميل بسعر حسب الكمية). originalPrice بيفضل سعر الصنف من الداتا و«price» اللي اتباع بيه، بسكيمة العميل.
 * الخصم بيفضل صفر: الإجمالي = الكمية × السعر، والخصم لو اتحسب كمان كان هيتطرح مرتين.
 */
function detailOf(item: Item, unit: Item['units'][number], quantity: number, field: PriceField, soldPrice?: number): OrderDetail {
  const originalPrice = unit[field] ?? 0;
  const discount = 0;
  const tax = 0;
  const bonusQuantity = 0;
  const price = soldPrice ?? originalPrice - discount;
  const avg = unit.avgCost ?? 0;
  const totalQuantity = quantity + bonusQuantity;
  const totalItems = quantity * price;
  const totalDiscount = quantity * discount;
  const totalTax = totalQuantity * tax;
  // الفاضي صفر، بطلب العميل: null في أي حسبة بيبوّظ الإجمالي كله
  const weight = unit.weight ?? 0;
  const volume = unit.volume ?? 0;
  return {
    itemId: item.id,
    item: item.name,
    unit: unit.name,
    unitContent: Math.round(unit.unitContent),
    bonusQuantity,
    quantity,
    totalQuantity,
    originalPrice,
    discount,
    price,
    tax,
    avg,
    profit: price - avg,
    totalItems,
    totalDiscount,
    totalTax,
    netTotal: totalItems - totalDiscount + totalTax,
    weight,
    volume,
    // في الكمية الكلية مش الكمية — البونص بيتشال على العربية كمان، بطلب العميل
    totalWeight: weight * totalQuantity,
    totalVolume: volume * totalQuantity,
    unpriced: soldPrice == null && unit[field] == null,
    measuresMissing: unit.weight == null || unit.volume == null,
    // لحد ما المخزن يعدّل الكميات: المطلوب هو اللي اتطلب، والانحراف صفر
    demanded: { quantity, unit: unit.name, price, tax, avg, totalItems },
    deviation: { quantity: 0, unit: unit.name, price, tax, avg, totalItems: 0 },
  };
}

type LineRef = Pick<LineInput, 'itemId' | 'unitName'>;

/**
 * الصنف والوحدة من أصناف المتجر — رسالة الخطأ لو مش موجودين. field: الوحدة لازم كمان
 * تكون بتتباع في المنفذ ده (تشيكات كارت الصنف، مكالمة ٦ أكتوبر). من غيره = سطر كان
 * في الأوردر قبل ما المنفذ يتقفل، فبيفضل زي ما هو
 */
function unitOf(items: Item[], line: LineRef, field?: PriceField) {
  const item = items.find((i) => i.id === line.itemId);
  const unit = item?.units.find((u) => u.name === line.unitName);
  if (!item || !unit) return `Item ${line.itemId} / ${line.unitName} is not in this store`;
  if (field && (unit.hiddenIn ?? []).includes(field)) return `Item ${line.itemId} / ${line.unitName} is not sold here`;
  return { item, unit };
}

const sameLine = (line: LineRef) => (d: OrderDetail) => d.itemId === line.itemId && d.unit === line.unitName;

/**
 * pricedBySeller: «مبيعات» — السعر اللي في السطر بيتاخد. غير كده بيتجاهل والسعر من المتجر.
 * kept: سطور المسودة المحفوظة — وحدة فيها بتعدّي حتى لو منفذها اتقفل بعدها
 */
export function buildDetails(items: Item[], lines: DraftInput['lines'], field: PriceField, pricedBySeller = false, kept: OrderDetail[] = []): OrderDetail[] | string {
  const details: OrderDetail[] = [];
  for (const line of lines) {
    const found = unitOf(items, line, kept.some(sameLine(line)) ? undefined : field);
    if (typeof found === 'string') return found;
    details.push(detailOf(found.item, found.unit, line.quantity, field, pricedBySeller ? line.price : undefined));
  }
  return details;
}

/**
 * صنف واحد اتغيّر في مسودة: بيحل محل سطره (في نفس مكانه)، أو بيتضاف في
 * الآخر، أو بيتشال لو الكمية صفر. الباقي زي ما هو.
 */
export function withLine(details: OrderDetail[], items: Item[], line: LineInput, field: PriceField, pricedBySeller = false): OrderDetail[] | string {
  const same = sameLine(line);
  if (line.quantity === 0) return details.filter((d) => !same(d));
  const found = unitOf(items, line, details.some(same) ? undefined : field);
  if (typeof found === 'string') return found;
  const detail = detailOf(found.item, found.unit, line.quantity, field, pricedBySeller ? line.price : undefined);
  return details.some(same) ? details.map((d) => (same(d) ? detail : d)) : [...details, detail];
}

/**
 * صنف اتغيّر في فاتورة اتأكدت — بالصلاحيات (مكالمة ٢ أكتوبر). الكمية المطلوبة
 * (demanded) بتفضل اللي العميل وافق عليه، والفرق بيتكتب في deviation: زي سكيمة
 * العميل لما المخزن يعدّل كميات الفاتورة. سعر السطر بيفضل اللي اتباع بيه، إلا
 * لو البائع كتب سعر تاني (soldPrice). الصنف الجديد مطلوب منه صفر، فكله انحراف.
 * الكمية صفر بتشيل السطر.
 */
export function withConfirmedLine(details: OrderDetail[], items: Item[], line: LineInput, field: PriceField, soldPrice?: number): OrderDetail[] | string {
  const same = sameLine(line);
  if (line.quantity === 0) return details.filter((d) => !same(d));
  const existing = details.find(same);
  if (existing) return details.map((d) => (same(d) ? rescaled(d, line.quantity, soldPrice ?? d.price) : d));
  const found = unitOf(items, line, field);
  if (typeof found === 'string') return found;
  const detail = detailOf(found.item, found.unit, line.quantity, field, soldPrice);
  if (detail.unpriced) return `Item ${line.itemId} / ${line.unitName} has no price yet`;
  return [...details, withDeviation({ ...detail, demanded: { ...detail.demanded, quantity: 0, totalItems: 0 } })];
}

/** نفس السطر بكمية (وسعر) تانيين — الإجماليات من جديد، والمطلوب زي ما هو */
function rescaled(d: OrderDetail, quantity: number, price: number): OrderDetail {
  const totalQuantity = quantity + d.bonusQuantity;
  const totalItems = quantity * price;
  const totalDiscount = quantity * d.discount;
  const totalTax = totalQuantity * d.tax;
  return withDeviation({
    ...d,
    quantity,
    totalQuantity,
    price,
    profit: price - d.avg,
    totalItems,
    totalDiscount,
    totalTax,
    netTotal: totalItems - totalDiscount + totalTax,
    totalWeight: (d.weight ?? 0) * totalQuantity,
    totalVolume: (d.volume ?? 0) * totalQuantity,
  });
}

/** الانحراف = اللي في الفاتورة دلوقتي ناقص المطلوب */
function withDeviation(d: OrderDetail): OrderDetail {
  return {
    ...d,
    deviation: { quantity: d.quantity - d.demanded.quantity, unit: d.unit, price: d.price, tax: d.tax, avg: d.avg, totalItems: d.totalItems - d.demanded.totalItems },
  };
}

export function totalsOf(details: OrderDetail[]) {
  const sum = (f: (d: OrderDetail) => number) => details.reduce((n, d) => n + f(d), 0);
  const totalItems = sum((d) => d.totalItems);
  const totalDiscount = sum((d) => d.totalDiscount);
  const totalTax = sum((d) => d.totalTax);
  const totalAvg = sum((d) => d.avg * d.totalQuantity);
  return {
    totalAvg,
    // البونص ليه تكلفة ومالوش تمن — فالربح من اللي اتباع ناقص تكلفة كل اللي خرج
    totalProfit: totalItems - totalDiscount - totalAvg,
    totalItems,
    totalTax,
    totalDiscount,
    netTotal: totalItems - totalDiscount + totalTax,
    totalDemanded: sum((d) => d.demanded.totalItems),
    totalDeviation: sum((d) => d.deviation.totalItems),
    totalWeight: sum((d) => d.totalWeight ?? 0),
    totalVolume: sum((d) => d.totalVolume ?? 0),
  };
}

export function storeItems(shopId: string) {
  return prisma.item.findMany({ where: { shopId } });
}

export function findDraft(creatorAcc: string, ref: string) {
  return prisma.order.findFirst({ where: { creator: { is: { acc: creatorAcc } }, ref, state: 'draft' } });
}

/**
 * مسودة «مبيعات» بتاعة النشاط البائع (مكالمة ٨ أكتوبر: «ده بيزنس خليها تظهر للجميع»)
 * — أي حد فيه بيكمّل على نفس المسودة، مش نسخة باسمه. الـref فيه رقم البيعة
 */
export function findSaleDraft(sellerAcc: string, ref: string) {
  return prisma.order.findFirst({ where: { from: { is: { acc: sellerAcc } }, source: 'onsite', ref, state: 'draft' } });
}

/**
 * بيعة «مبيعات» اتأكدت (أو اتلغت) — رقم البيعة مبيتكررش، فمسودة جديدة بنفس الـref تبقى
 * نسخة مكررة من سلة فاضلة على جهاز زميل (رسالة العميل ٩ أكتوبر: «قطاعي 12» مسودة تانية
 * لفاتورة اتسلّمت)
 */
export function findClosedSale(sellerAcc: string, ref: string) {
  return prisma.order.findFirst({ where: { from: { is: { acc: sellerAcc } }, source: 'onsite', ref, state: { not: 'draft' } } });
}

/** من البيعات دي، اللي اتأكدت في أنشطتي — السلال بتاعتها على الجهاز قديمة وبتتمسح */
export async function listClosedSaleRefs(sellerAccs: string[], refs: string[]) {
  if (sellerAccs.length === 0 || refs.length === 0) return [];
  const closed = await prisma.order.findMany({
    where: { from: { is: { acc: { in: sellerAccs } } }, source: 'onsite', ref: { in: refs }, state: { not: 'draft' } },
    select: { ref: true },
  });
  return [...new Set(closed.map((o) => o.ref))];
}

/** مسودات «مبيعات» اللي لسه متأكدتش للأنشطة دي — اللي عملها أي حد فيها */
export function listSaleDrafts(sellerAccs: string[]) {
  if (sellerAccs.length === 0) return Promise.resolve([]);
  return prisma.order.findMany({
    where: { from: { is: { acc: { in: sellerAccs } } }, source: 'onsite', state: 'draft' },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
}

/**
 * المسودة كلها. القديمة بتتحدّث بشرط إنها لسه مسودة: حفظ متأخر كان بيوصل بعد
 * «تأكيد» ويرجّع الأوردر المؤكد مسودة (state: 'draft') — ظهر مع «تأكيد» من
 * أكورديون «مبيعات» (١ أكتوبر). null = اتأكدت في النص.
 */
export async function saveDraft(existingId: string | null, data: Prisma.OrderCreateInput) {
  if (!existingId) return prisma.order.create({ data });
  const { count } = await prisma.order.updateMany({ where: { id: existingId, state: 'draft' }, data: data as Prisma.OrderUpdateManyMutationInput });
  return count === 1 ? prisma.order.findUnique({ where: { id: existingId } }) : null;
}

/**
 * سطور وإجماليات مسودة — بشرط إنها متغيّرتش من ساعة ما اتقرت (updatedAt).
 * false = حد تاني عدّلها في النص (صنفين اتحفظوا في نفس اللحظة)، فالنداء يعيد.
 */
export async function replaceDetails(order: Order, details: OrderDetail[], editor: { acc: string; name: string }) {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, state: 'draft', updatedAt: order.updatedAt },
    data: { details, ...totalsOf(details), editor, updatedAt: new Date() },
  });
  return count === 1;
}

/** زي replaceDetails، لفاتورة اتأكدت: بشرط إنها لسه في نفس المرحلة ومتغيّرتش */
export async function replaceConfirmedDetails(order: Order, details: OrderDetail[], editor: { acc: string; name: string }) {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, state: order.state, updatedAt: order.updatedAt },
    data: { details, ...totalsOf(details), editor, updatedAt: new Date() },
  });
  return count === 1;
}

export function deleteOrder(id: string) {
  return prisma.order.delete({ where: { id } });
}

/** أوردرات المستخدم — اللي عملها هو، الأحدث الأول. من غير فلاتر لحد ما الحالات تتحدد */
export function listMine(creatorAcc: string) {
  return prisma.order.findMany({ where: { creator: { is: { acc: creatorAcc } } }, orderBy: { updatedAt: 'desc' }, take: 200 });
}

/**
 * «طلباتي» (رسالة العميل ٦ أكتوبر: «where orders.from = أنا أو البيزنس اللي انا فاتحه»):
 * الأوردرات اللي المشتري فيها الحساب المختار — المستخدم نفسه أو نشاط بيديره —
 * حتى اللي حد تاني في النشاط طلبها. المسودات اللي هو عاملها بس: مسودة حد تاني
 * لسه سلة على جهازه.
 */
export function listPurchases(buyerAcc: string, meAcc: string) {
  return prisma.order.findMany({
    where: {
      to: { is: { acc: buyerAcc } },
      OR: [{ state: { not: 'draft' } }, { creator: { is: { acc: meAcc } } }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
}

/**
 * الأوردرات المفتوحة (اتأكدت ولسه متمتش — في أي مرحلة من مراحل النشاط) اللي
 * النشاط ده بائعها، الأحدث تأكيداً الأول
 */
export function listIncoming(sellerAcc: string) {
  return prisma.order.findMany({
    where: { from: { is: { acc: sellerAcc } }, state: { notIn: CLOSED_STATES } },
    orderBy: { checkedOutAt: 'desc' },
    take: 200,
  });
}

export function findById(id: string) {
  return prisma.order.findUnique({ where: { id } });
}

/** الرقم الجاي من عدّاد — findAndModify ذري، فطلبين في نفس اللحظة ميخدوش نفس الرقم */
async function nextSerial(counter: string): Promise<number> {
  const res = (await prisma.$runCommandRaw({
    findAndModify: 'counters',
    query: { _id: counter },
    update: { $inc: { seq: 1 } },
    upsert: true,
    new: true,
  })) as { value: { seq: number } };
  return res.value.seq;
}

/** رقم الطلب الجاي للنشاط ده — مع «تأكيد». العدّاد اسمه invoice:… من قبل مسلسل الفواتير */
export const nextNumber = (sellerAcc: string) => nextSerial(`invoice:${sellerAcc}`);

/**
 * المرجع الكبير الجاي للنشاط البائع (مكالمة ٨ أكتوبر: «البيج سيريال») — مع أول حفظ للأوردر،
 * وهو نفسه رقم المسودة (رسالة العميل ٩ أكتوبر). المسودة اللي بتتمسح رقمها مبيرجعش — المتصل
 * المهم مسلسل الفواتير
 */
export const nextOrderSerial = (sellerAcc: string) => nextSerial(`serial:${sellerAcc}`);

export function checkOut(id: string, number: number) {
  return prisma.order.update({ where: { id }, data: { state: 'order', kind: 'order', number, checkedOutAt: new Date() } });
}

/**
 * المرحلة اللي بعدها — بشرط إن الأوردر لسه في المرحلة اللي الواجهة شافتها،
 * فدوستين في نفس اللحظة مبينقلوش مرحلتين. null = اتغيّر من مكان تاني.
 */
export async function advanceState(order: Order, to: string, person: { acc: string; name: string }, invoice: boolean) {
  const data = { state: to, ...(to === 'done' ? { completedAt: new Date() } : {}), ...(invoice ? { kind: 'invoice' } : {}) };
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.order.updateMany({ where: { id: order.id, state: order.state }, data });
        if (count !== 1) return null;
        if (!invoice) return (await tx.order.findUnique({ where: { id: order.id } }))!;
        // رسالة العميل ٨ أكتوبر: الأوردر بقى فاتورة — رقمها من مسلسل الفواتير (بعد ما النقلة
        // اتأكدت، فالعدّاد مبيزيدش على نقلة اترفضت) وحركته بتدخل الجدول الحاكم، في نفس العملية
        const saved = await tx.order.update({ where: { id: order.id }, data: { invoiceNumber: await nextInvoiceNumber(tx, order.from.acc) } });
        await recordSale(tx, saved, person);
        return saved;
      });
    } catch (err) {
      // مونجو وقّف عملية: نفس الأوردر اتداس مرتين، أو فاتورتين في نفس اللحظة على عدّاد الفواتير.
      // العملية رجعت كلها فبنعيدها: الأوردر اللي اتنقل خلاص بيرجع null (409)، والتاني بياخد الرقم اللي بعده
      if (isWriteConflict(err) && attempt < SERIAL_RETRIES) continue;
      if (isWriteConflict(err)) return null;
      throw err;
    }
  }
}

/**
 * رأس فاتورة مؤكدة (رسالة العميل ٦ أكتوبر) — بشرط إنها متغيّرتش من ساعة ما
 * اتقرت. null = اتعدّلت أو اتنقلت من مكان تاني في نفس اللحظة
 */
export async function replaceHeader(order: Order, data: Prisma.OrderUpdateManyMutationInput) {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, state: order.state, updatedAt: order.updatedAt },
    data: { ...data, updatedAt: new Date() },
  });
  return count === 1 ? prisma.order.findUnique({ where: { id: order.id } }) : null;
}

/**
 * الإلغاء (مكالمة ٥ أكتوبر): من المرحلة اللي الأوردر فيها لـcancelled، مع مين
 * لغى وليه. لو اتنقل أو اتعدّل في نفس اللحظة من جهاز تاني: null
 */
export async function cancelState(order: Order, by: 'seller' | 'buyer', person: { acc: string; name: string }, reason: string) {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, state: order.state, updatedAt: order.updatedAt },
    data: { state: 'cancelled', cancellation: { by, person, reason, at: new Date() }, editor: person, updatedAt: new Date() },
  });
  return count === 1 ? prisma.order.findUnique({ where: { id: order.id } }) : null;
}

/**
 * الأوردرات اللي قبل عمود source (١ أكتوبر): «مبيعات» = onsite والباقي online.
 * مرة واحدة فعلياً ساعة ما السيرفر يقوم.
 */
export async function backfillOrderSources(): Promise<number> {
  let n = 0;
  for (const [filter, source] of [
    [{ source: { $exists: false }, sale: null }, 'online'],
    [{ source: { $exists: false }, sale: { $ne: null } }, 'onsite'],
  ] as const) {
    const res = (await prisma.$runCommandRaw({ update: 'orders', updates: [{ q: filter, u: { $set: { source } }, multi: true }] })) as { nModified?: number };
    n += res.nModified ?? 0;
  }
  return n;
}

/** كام مرة الرقم بيحاول تاني لو المستند اتكتب من مكان تاني في نفس اللحظة */
const SERIAL_RETRIES = 5;

/** رقم من العدّاد ده للأوردر ده لو لسه ملوش — في عملية واحدة، فالعدّاد مبيزيدش على الفاضي */
async function numberOnce(id: string, field: 'invoiceNumber' | 'serial', next: (tx: Prisma.TransactionClient, sellerAcc: string) => Promise<number>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (!order || order[field] != null) return false;
        await tx.order.update({ where: { id }, data: { [field]: await next(tx, order.from.acc), updatedAt: order.updatedAt } });
        return true;
      });
    } catch (err) {
      if (isWriteConflict(err) && attempt < SERIAL_RETRIES) continue;
      throw err;
    }
  }
}

/**
 * المسلسلات (مكالمة ٨ أكتوبر) للأوردرات اللي قبلها — ساعة ما السيرفر يقوم، بعد ما الفواتير
 * تاخد kind: كل أوردر بمرجعه الكبير بترتيب ما اتعمل، والفاتورة برقم فاتورة بترتيب ما بقت
 * فاتورة (حركة البيع بتاعتها في الجدول الحاكم). ورقم المسودة هو المرجع لكل أوردر، حتى اللي
 * اتأكد قبل كده (رسالة العميل ٩ أكتوبر: «المسودات القديمة واخدة null… اديها أرقام») — والمسودات
 * اللي خدت رقم من عدّاد المسودات القديم بتاخد مرجعها. الطلبات بأرقامها زي ما هي، وupdatedAt زي
 * ما هو. اللي اترقّم مبيترقّمش تاني
 */
export async function backfillSerials(): Promise<{ serials: number; invoices: number; drafts: number }> {
  const unserialed = await prisma.order.findMany({
    where: { OR: [{ serial: null }, { serial: { isSet: false } }] },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const invoices = await prisma.order.findMany({
    where: { kind: 'invoice', OR: [{ invoiceNumber: null }, { invoiceNumber: { isSet: false } }] },
    select: { id: true, completedAt: true, updatedAt: true },
  });
  const sales = invoices.length
    ? await prisma.transaction.findMany({ where: { kind: 'sale', source: 'order', ref: { in: invoices.map((o) => o.id) } }, select: { ref: true, createdAt: true } })
    : [];
  const invoicedAt = new Map<string, number>();
  for (const t of sales) invoicedAt.set(t.ref, Math.min(invoicedAt.get(t.ref) ?? Infinity, t.createdAt.getTime()));
  const at = (o: (typeof invoices)[number]) => invoicedAt.get(o.id) ?? (o.completedAt ?? o.updatedAt).getTime();
  invoices.sort((a, b) => at(a) - at(b));

  let serials = 0;
  for (const o of unserialed) if (await numberOnce(o.id, 'serial', nextSerialCounter)) serials++;
  let numberedInvoices = 0;
  for (const o of invoices) if (await numberOnce(o.id, 'invoiceNumber', nextInvoiceNumber)) numberedInvoices++;
  // رقم المسودة = المرجع، في أمر واحد على المونجو (من غير ما updatedAt يتلمس). مسودة اتعملت
  // في نفس اللحظة بتاخد الاتنين مع بعض من putDraft
  const res = (await prisma.$runCommandRaw({
    update: 'orders',
    updates: [{ q: { serial: { $type: 'number' }, $expr: { $ne: ['$draftNumber', '$serial'] } }, u: [{ $set: { draftNumber: '$serial' } }], multi: true }],
  })) as { nModified?: number };
  // عدّاد المسودات القديم ملوش لازمة بعد كده
  await prisma.counter.deleteMany({ where: { id: { startsWith: 'draft:' } } });
  return { serials, invoices: numberedInvoices, drafts: res.nModified ?? 0 };
}

/** عدّاد المرجع الكبير جوه عملية — نفس عدّاد nextOrderSerial */
async function nextSerialCounter(tx: Prisma.TransactionClient, sellerAcc: string): Promise<number> {
  const id = `serial:${sellerAcc}`;
  const { seq } = await tx.counter.upsert({ where: { id }, create: { id, seq: 1 }, update: { seq: { increment: 1 } } });
  return seq;
}
