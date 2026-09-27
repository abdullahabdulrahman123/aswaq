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
    seller: order.seller.name,
    method: order.method,
    address: order.address,
    lines: order.details.map((d) => ({
      key: `${d.itemId}|${d.unit}`,
      item: d.item,
      unit: d.unit,
      quantity: d.quantity,
      price: d.unpriced ? null : d.price,
    })),
    total: order.netTotal,
    // الوزن بالجرام والحجم بالسنتيمتر المكعب في الأوردر
    weightKg: order.details.some((d) => d.weight) ? order.totalWeight / 1000 : null,
    volumeM3: order.details.some((d) => d.volume) ? (order.totalVolume ?? 0) / 1_000_000 : null,
  };
}
