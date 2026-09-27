import type { Item, Order, OrderDetail, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import type { DraftInput, LineInput } from '../schemas/order.schema.js';

type PriceField = 'onSWP' | 'onSRP' | 'onLWP' | 'onLRP';

/** نفس قاعدة الواجهة (lib/itemUnits.ts): النشاط جملة والفرد قطاعي، والاستلام سعر المحل والتوصيل الأونلاين */
export function priceFieldFor(method: 'pickup' | 'delivery', buyerKind: 'user' | 'business'): PriceField {
  const wholesale = buyerKind === 'business';
  if (method === 'pickup') return wholesale ? 'onSWP' : 'onSRP';
  return wholesale ? 'onLWP' : 'onLRP';
}

/** سطر واحد من وحدة صنف — الأسعار من المتجر، والإجماليات بالسكيمة اللي العميل بعتها */
function detailOf(item: Item, unit: Item['units'][number], quantity: number, field: PriceField): OrderDetail {
  const originalPrice = unit[field] ?? 0;
  const discount = 0;
  const tax = 0;
  const bonusQuantity = 0;
  const price = originalPrice - discount;
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
    unpriced: unit[field] == null,
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

export function buildDetails(items: Item[], lines: DraftInput['lines'], field: PriceField): OrderDetail[] | string {
  const details: OrderDetail[] = [];
  for (const line of lines) {
    const found = unitOf(items, line);
    if (typeof found === 'string') return found;
    details.push(detailOf(found.item, found.unit, line.quantity, field));
  }
  return details;
}

/**
 * صنف واحد اتغيّر في مسودة: بيحل محل سطره (في نفس مكانه)، أو بيتضاف في
 * الآخر، أو بيتشال لو الكمية صفر. الباقي زي ما هو.
 */
export function withLine(details: OrderDetail[], items: Item[], line: LineInput, field: PriceField): OrderDetail[] | string {
  const same = (d: OrderDetail) => d.itemId === line.itemId && d.unit === line.unitName;
  if (line.quantity === 0) return details.filter((d) => !same(d));
  const found = unitOf(items, line);
  if (typeof found === 'string') return found;
  const detail = detailOf(found.item, found.unit, line.quantity, field);
  return details.some(same) ? details.map((d) => (same(d) ? detail : d)) : [...details, detail];
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

export function saveDraft(existingId: string | null, data: Prisma.OrderCreateInput) {
  if (existingId) return prisma.order.update({ where: { id: existingId }, data });
  return prisma.order.create({ data });
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

export function deleteOrder(id: string) {
  return prisma.order.delete({ where: { id } });
}

/** أوردرات المستخدم — اللي عملها هو، الأحدث الأول. من غير فلاتر لحد ما الحالات تتحدد */
export function listMine(creatorAcc: string) {
  return prisma.order.findMany({ where: { creator: { is: { acc: creatorAcc } } }, orderBy: { updatedAt: 'desc' }, take: 200 });
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
