import { prisma } from '../config/db.js';
import type { WaslaBusiness } from '../middleware/auth.js';

/**
 * الصلاحيات — مكالمة ٢ أكتوبر. «الرصيد» بتاع أسواق: بيزيد كل ما حتة تحتاج
 * صلاحية، والشركات كلها بتاخد منه. كل صلاحية ليها أقسام (array) — صاحب الشركة
 * لما يعيّن محاسب بيفتحله صلاحيات «حسابات» كلها أو بعضها.
 *
 * الموظف بيتسجل له المفتوح بس، في وصلة (business_employees.permissions)، ووصلة
 * بترجّعه مع «شركاتي». صاحب الشركة معاه كله. اللي ملوش صلاحية بيلاقي الزرار
 * مقفول، والدوسة بتقوله يطلبها (الطلب نفسه هييجي مع «مهامي» الجديدة).
 *
 * defaultOn: الموظفين لسه قليلين، فاللي يعطّل الشغل بيتفتح للموظف الجديد لوحده،
 * وصاحب الشركة يقفل اللي هو عايزه.
 */
export const CATEGORIES: Record<string, string> = {
  sales: 'مبيعات',
};

export const PERMISSIONS = {
  /** خانة السعر في «مبيعات» — في المسودة وبعد التأكيد */
  invoicePrice: 'sales.invoice.price',
  /** كمية صنف في فاتورة اتأكدت (أو شيله منها) */
  invoiceQuantity: 'sales.invoice.quantity',
  /** صنف مكانش في الفاتورة وهي متأكدة */
  invoiceAddItem: 'sales.invoice.add_item',
  /** إلغاء فاتورة مؤكدة لسه مخلصتش، بسبب (مكالمة ٥ أكتوبر) */
  invoiceCancel: 'sales.invoice.cancel',
  /** رأس فاتورة مؤكدة: العميل والموبايل والاستلام والعنوان وميعاد التسليم (رسالة العميل ٦ أكتوبر) */
  invoiceHeader: 'sales.invoice.header',
  /** صفحة «مؤشرات المبيعات» (مكالمة ٦ أكتوبر) — اتباع بكام النهارده، وفي الطريق، والطلبات الجاية */
  salesMetrics: 'sales.metrics',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const CATALOG: { key: PermissionKey; name: string; categories: string[]; defaultOn: boolean }[] = [
  { key: PERMISSIONS.invoicePrice, name: 'تغيير سعر صنف في فاتورة البيع', categories: ['sales'], defaultOn: true },
  { key: PERMISSIONS.invoiceQuantity, name: 'تغيير كمية صنف في فاتورة البيع', categories: ['sales'], defaultOn: true },
  { key: PERMISSIONS.invoiceAddItem, name: 'إضافة صنف مش موجود في فاتورة البيع', categories: ['sales'], defaultOn: true },
  { key: PERMISSIONS.invoiceCancel, name: 'إلغاء فاتورة بيع', categories: ['sales'], defaultOn: true },
  { key: PERMISSIONS.invoiceHeader, name: 'تعديل بيانات فاتورة البيع', categories: ['sales'], defaultOn: true },
  // أرقام الشركة — صاحبها بيفتحها لمين هو عايزه، مش بتتفتح لوحدها
  { key: PERMISSIONS.salesMetrics, name: 'مؤشرات المبيعات', categories: ['sales'], defaultOn: false },
];

/** الرصيد في الداتابيز زي الكود — ساعة ما السيرفر يقوم */
export async function syncPermissions(): Promise<void> {
  await Promise.all(
    CATALOG.map((p, sort) =>
      prisma.permission.upsert({
        where: { key: p.key },
        create: { ...p, sort },
        update: { name: p.name, categories: p.categories, defaultOn: p.defaultOn, sort },
      }),
    ),
  );
}

export function listPermissions() {
  return prisma.permission.findMany({ orderBy: { sort: 'asc' } });
}

/** صاحب الشركة معاه كله، والموظف المفتوح له بس */
export function can(business: WaslaBusiness | undefined, key: PermissionKey): boolean {
  if (!business) return false;
  return (business.job ?? 'owner') === 'owner' || (business.permissions ?? []).includes(key);
}
