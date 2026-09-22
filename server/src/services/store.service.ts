import { prisma } from '../config/db.js';
import { isObjectId } from '../schemas/common.js';
import type { StoreSettingsInput } from '../schemas/item.schema.js';

/**
 * الحدود الدنيا في قاعدة البيانات أسماؤها minSWP…، وبرّه بتتبعت بأسماء الأسعار
 * نفسها (onSWP…) عشان الواجهة تاخد الحد بنفس مفتاح السعر اللي بتعرضه.
 */
export const toMinimums = (s: { minSWP: number | null; minSRP: number | null; minLWP: number | null; minLRP: number | null }) => ({
  onSWP: s.minSWP,
  onSRP: s.minSRP,
  onLWP: s.minLWP,
  onLRP: s.minLRP,
});

/** إعدادات متاجر النشاط ده — لفورم المقر في «بيانات الشركة» */
export function listStoreSettings(accountId: string) {
  return prisma.storeSettings.findMany({ where: { accountId } });
}

/**
 * إعدادات المتجر: نطاق التوصيل (null = مبيوصّلش) والحدود الدنيا للأوردر. الصف
 * بيتعمل مع أول حفظ — المتجر اللي ملوش صف لسه صاحبه محددش حاجة. الحدود اللي
 * مبتتبعتش بتفضل زي ما هي.
 */
export function saveStoreSettings(accountId: string, shopId: string, input: StoreSettingsInput) {
  const { deliveryRadiusKm, minimums } = input;
  const mins = minimums && {
    minSWP: minimums.onSWP,
    minSRP: minimums.onSRP,
    minLWP: minimums.onLWP,
    minLRP: minimums.onLRP,
  };
  return prisma.storeSettings.upsert({
    where: { shopId },
    create: { accountId, shopId, deliveryRadiusKm, ...mins },
    update: { deliveryRadiusKm, ...mins },
  });
}

/** نطاق توصيل كل المتاجر اللي بتوصّل — للمعرض، عشان يعرف مين بيوصّل لمكان المشتري */
export function listDeliveryRadii() {
  return prisma.storeSettings.findMany({
    where: { deliveryRadiusKm: { not: null } },
    select: { shopId: true, deliveryRadiusKm: true },
  });
}

/** صفحة المتجر في المعرض: نطاقه وحدوده الدنيا وأصنافه */
export async function findShowroomStore(shopId: string) {
  if (!isObjectId(shopId)) return null;
  const [settings, items] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { shopId } }),
    prisma.item.findMany({ where: { shopId }, orderBy: { name: 'asc' } }),
  ]);
  return {
    deliveryRadiusKm: settings?.deliveryRadiusKm ?? null,
    minimums: settings ? toMinimums(settings) : { onSWP: null, onSRP: null, onLWP: null, onLRP: null },
    items,
  };
}
