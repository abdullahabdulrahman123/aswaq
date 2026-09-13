import { prisma } from '../config/db.js';
import { isObjectId } from '../schemas/common.js';
import type { ShopInput } from '../schemas/shop.schema.js';

export function listShops(accountId: string) {
  return prisma.shop.findMany({ where: { accountId }, orderBy: { id: 'asc' } });
}

export function createShop(accountId: string, input: ShopInput) {
  return prisma.shop.create({ data: { accountId, ...input } });
}

/**
 * كل عملية على محل مقيّدة بالـaccountId كمان: من غيره، حد يدير نشاط يقدر
 * يحط id محل تبع نشاط تاني في الرابط ويعدّله.
 */
export function findShop(accountId: string, shopId: string) {
  if (!isObjectId(shopId)) return Promise.resolve(null);
  return prisma.shop.findFirst({ where: { id: shopId, accountId } });
}

export async function updateShop(accountId: string, shopId: string, input: ShopInput) {
  if (!(await findShop(accountId, shopId))) return null;
  return prisma.shop.update({ where: { id: shopId }, data: input });
}

/**
 * delete مش deleteMany: Prisma بتنفّذ onDelete: Cascade بنفسها مع MongoDB
 * (مفيش مفاتيح أجنبية حقيقية)، وده بيحصل في delete — فنسخ المحل من الأصناف
 * بتتمسح معاه.
 */
export async function deleteShop(accountId: string, shopId: string): Promise<boolean> {
  if (!(await findShop(accountId, shopId))) return false;
  await prisma.shop.delete({ where: { id: shopId } });
  return true;
}
