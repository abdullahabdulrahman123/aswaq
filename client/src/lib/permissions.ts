import type { Business } from '../context/AuthContext';

/**
 * الصلاحيات (مكالمة ٢ أكتوبر) — نفس مفاتيح رصيد أسواق (server/src/services/permissions.ts).
 * صاحب الشركة معاه كله، والموظف المفتوح له بس (من «شركاتي» في وصلة). اللي
 * ملوش صلاحية الزرار عنده مقفول، والدوسة بتقوله يطلبها من صاحب الشركة.
 */
export const PERMISSIONS = {
  /** خانة السعر في «مبيعات» */
  invoicePrice: 'sales.invoice.price',
  /** كمية صنف في فاتورة اتأكدت */
  invoiceQuantity: 'sales.invoice.quantity',
  /** صنف مكانش في الفاتورة وهي متأكدة */
  invoiceAddItem: 'sales.invoice.add_item',
  /** إلغاء فاتورة مؤكدة لسه مخلصتش (مكالمة ٥ أكتوبر) */
  invoiceCancel: 'sales.invoice.cancel',
  /** رأس فاتورة مؤكدة — العميل والاستلام وميعاد التسليم (رسالة العميل ٦ أكتوبر) */
  invoiceHeader: 'sales.invoice.header',
  /** صفحة «مؤشرات المبيعات» (مكالمة ٦ أكتوبر) */
  salesMetrics: 'sales.metrics',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** اسمها زي ما بيظهر لما تكون مقفولة */
export const PERMISSION_NAMES: Record<PermissionKey, string> = {
  'sales.invoice.price': 'تغيير سعر صنف في فاتورة البيع',
  'sales.invoice.quantity': 'تغيير كمية صنف في فاتورة البيع',
  'sales.invoice.add_item': 'إضافة صنف مش موجود في فاتورة البيع',
  'sales.invoice.cancel': 'إلغاء فاتورة بيع',
  'sales.invoice.header': 'تعديل بيانات فاتورة البيع',
  'sales.metrics': 'مؤشرات المبيعات',
};

export const isOwner = (business: Pick<Business, 'job'> | undefined) => (business?.job ?? 'owner') === 'owner';

export function can(business: Pick<Business, 'job' | 'permissions'> | undefined, key: PermissionKey): boolean {
  if (!business) return false;
  return isOwner(business) || (business.permissions ?? []).includes(key);
}

/** الرسالة لما الصلاحية مقفولة — الطلب من «مهامي» لسه */
export const deniedMessage = (key: PermissionKey) => `«${PERMISSION_NAMES[key]}» مش متاحة لك. اطلبها من صاحب الشركة.`;
