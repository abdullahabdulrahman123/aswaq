import { prisma } from '../config/db.js';
import { isObjectId } from '../schemas/common.js';

/** إعدادات متاجر النشاط ده — لفورم المقر في «بيانات الشركة» */
export function listStoreSettings(accountId: string) {
  return prisma.storeSettings.findMany({ where: { accountId } });
}

/**
 * نطاق توصيل المتجر. null = مبيوصّلش. الصف بيتعمل مع أول حفظ — المتجر اللي
 * ملوش صف لسه صاحبه محددش حاجة، يعني مبيوصّلش برضه.
 */
export function setDeliveryRadius(accountId: string, shopId: string, deliveryRadiusKm: number | null) {
  return prisma.storeSettings.upsert({
    where: { shopId },
    create: { accountId, shopId, deliveryRadiusKm },
    update: { deliveryRadiusKm },
  });
}

/** نطاق توصيل كل المتاجر اللي بتوصّل — للمعرض، عشان يعرف مين بيوصّل لمكان المشتري */
export function listDeliveryRadii() {
  return prisma.storeSettings.findMany({
    where: { deliveryRadiusKm: { not: null } },
    select: { shopId: true, deliveryRadiusKm: true },
  });
}

/** صفحة المتجر في المعرض: نطاقه وأصنافه */
export async function findShowroomStore(shopId: string) {
  if (!isObjectId(shopId)) return null;
  const [settings, items] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { shopId } }),
    prisma.item.findMany({ where: { shopId }, orderBy: { name: 'asc' } }),
  ]);
  return { deliveryRadiusKm: settings?.deliveryRadiusKm ?? null, items };
}
