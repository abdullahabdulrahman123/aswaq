import type { InvoiceView } from '../components/InvoiceSheet';
import type { Order } from './aswaqApi';

/** أوردر من السيرفر بشكل الفاتورة */
export function orderToView(order: Order): InvoiceView {
  return {
    number: order.number,
    businessName: order.names.business,
    storeName: order.names.store,
    date: new Date(order.checkedOutAt ?? order.updatedAt),
    buyer: order.names.buyer,
    buyerPhone: order.names.buyerPhone,
    method: order.method,
    address: order.address,
    deliveryAt: order.deliveryAt ?? null,
    deliveryNotes: order.deliveryNotes ?? null,
    lines: order.details.map((d) => ({
      key: `${d.itemId}|${d.unit}`,
      itemId: d.itemId,
      item: d.item,
      unit: d.unit,
      quantity: d.quantity,
      price: d.unpriced ? null : d.price,
    })),
    total: order.netTotal,
    // الوزن بالجرام في الأوردر
    weightKg: order.details.some((d) => d.weight) ? order.totalWeight / 1000 : null,
    // الوزن بس على الفاتورة (٥ أكتوبر) — measuresMissing بتاع السطر فيه الحجم كمان. السيرفر
    // بيحسب الوزن الفاضي صفر، فالصفر = متسجّلش
    measuresMissing: order.details.some((d) => !d.weight),
  };
}
