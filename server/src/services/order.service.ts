import type { Item, OrderDetail, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import type { DraftInput } from '../schemas/order.schema.js';

type PriceField = 'onSWP' | 'onSRP' | 'onLWP' | 'onLRP';

/** نفس قاعدة الواجهة (lib/itemUnits.ts): النشاط جملة والفرد قطاعي، والاستلام سعر المحل والتوصيل الأونلاين */
export function priceFieldFor(method: 'pickup' | 'delivery', buyerKind: 'user' | 'business'): PriceField {
  const wholesale = buyerKind === 'business';
  if (method === 'pickup') return wholesale ? 'onSWP' : 'onSRP';
  return wholesale ? 'onLWP' : 'onLRP';
}

/** الأسعار كلها من صنف المتجر — والإجماليات بالسكيمة اللي العميل بعتها */
export function buildDetails(items: Item[], lines: DraftInput['lines'], field: PriceField): OrderDetail[] | string {
  const byId = new Map(items.map((i) => [i.id, i]));
  const details: OrderDetail[] = [];
  for (const line of lines) {
    const item = byId.get(line.itemId);
    const unit = item?.units.find((u) => u.name === line.unitName);
    if (!item || !unit) return `Item ${line.itemId} / ${line.unitName} is not in this store`;

    const originalPrice = unit[field] ?? 0;
    const discount = 0;
    const tax = 0;
    const bonusQuantity = 0;
    const price = originalPrice - discount;
    const avg = unit.avgCost ?? 0;
    const quantity = line.quantity;
    const totalQuantity = quantity + bonusQuantity;
    const totalItems = quantity * price;
    const totalDiscount = quantity * discount;
    const totalTax = totalQuantity * tax;
    details.push({
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
      weight: unit.weight ?? null,
      unpriced: unit[field] == null,
      // لحد ما المخزن يعدّل الكميات: المطلوب هو اللي اتطلب، والانحراف صفر
      demanded: { quantity, unit: unit.name, price, tax, avg, totalItems },
      deviation: { quantity: 0, unit: unit.name, price, tax, avg, totalItems: 0 },
    });
  }
  return details;
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
    totalWeight: sum((d) => (d.weight ?? 0) * d.totalQuantity),
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
