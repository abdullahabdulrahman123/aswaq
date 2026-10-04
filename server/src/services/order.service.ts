import type { Item, Order, OrderDetail, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import type { DraftInput, LineInput } from '../schemas/order.schema.js';
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

/** الصنف والوحدة من أصناف المتجر — رسالة الخطأ لو مش موجودين */
function unitOf(items: Item[], line: LineRef) {
  const item = items.find((i) => i.id === line.itemId);
  const unit = item?.units.find((u) => u.name === line.unitName);
  return item && unit ? { item, unit } : `Item ${line.itemId} / ${line.unitName} is not in this store`;
}

/** pricedBySeller: «مبيعات» — السعر اللي في السطر بيتاخد. غير كده بيتجاهل والسعر من المتجر */
export function buildDetails(items: Item[], lines: DraftInput['lines'], field: PriceField, pricedBySeller = false): OrderDetail[] | string {
  const details: OrderDetail[] = [];
  for (const line of lines) {
    const found = unitOf(items, line);
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
  const same = (d: OrderDetail) => d.itemId === line.itemId && d.unit === line.unitName;
  if (line.quantity === 0) return details.filter((d) => !same(d));
  const found = unitOf(items, line);
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
  const same = (d: OrderDetail) => d.itemId === line.itemId && d.unit === line.unitName;
  if (line.quantity === 0) return details.filter((d) => !same(d));
  const existing = details.find(same);
  if (existing) return details.map((d) => (same(d) ? rescaled(d, line.quantity, soldPrice ?? d.price) : d));
  const found = unitOf(items, line);
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

export function findMine(creatorAcc: string, id: string) {
  return prisma.order.findFirst({ where: { id, creator: { is: { acc: creatorAcc } } } });
}

/** رقم الفاتورة الجاي للنشاط ده — findAndModify ذري، فطلبين في نفس اللحظة ميخدوش نفس الرقم */
export async function nextNumber(sellerAcc: string): Promise<number> {
  const res = (await prisma.$runCommandRaw({
    findAndModify: 'counters',
    query: { _id: `invoice:${sellerAcc}` },
    update: { $inc: { seq: 1 } },
    upsert: true,
    new: true,
  })) as { value: { seq: number } };
  return res.value.seq;
}

export function checkOut(id: string, number: number) {
  return prisma.order.update({ where: { id }, data: { state: 'order', number, checkedOutAt: new Date() } });
}

/**
 * المرحلة اللي بعدها — بشرط إن الأوردر لسه في المرحلة اللي الواجهة شافتها،
 * فدوستين في نفس اللحظة مبينقلوش مرحلتين. null = اتغيّر من مكان تاني.
 */
export async function advanceState(order: Order, to: string) {
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, state: order.state },
    data: { state: to, ...(to === 'done' ? { completedAt: new Date() } : {}) },
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
