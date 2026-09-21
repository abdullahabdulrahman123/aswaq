import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { isObjectId } from '../schemas/common.js';
import type { CreateItemInput, UpdateItemInput } from '../schemas/item.schema.js';

/** فيه صنف بنفس الاسم في نفس المستوى (النشاط أو نفس المتجر) — بيتترجم لـ409 */
export class ItemNameTakenError extends Error {
  constructor() {
    super('Item name already used');
    this.name = 'ItemNameTakenError';
  }
}

/**
 * الفهرس الفريد على (accountId, shopId, name) هو اللي بيمنع التكرار، مش فحص
 * قبل الحفظ — فمفيش سباق بين طلبين بنفس الاسم.
 */
function rethrowNameTaken(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new ItemNameTakenError();
  }
  throw err;
}

/** shopId = null → أصناف النشاط نفسه · shopId = id → نسخ المتجر ده */
export function listItems(accountId: string, shopId: string | null) {
  return prisma.item.findMany({ where: { accountId, shopId }, orderBy: { name: 'asc' } });
}

/**
 * أصناف النشاط اللي لسه مضافتش للمتجر ده — دي اللي بتظهر في كومبو الإضافة،
 * بطلب العميل: «أجيب أصناف الشركة اللي مدخلتش المتجر».
 *
 * النسخة بتاخد اسم الأصل زي ما هو، فالاسم هو اللي بيقول ده اتضاف قبل كده.
 */
export async function listItemsNotInStore(accountId: string, shopId: string) {
  const [items, inStore] = await Promise.all([
    listItems(accountId, null),
    prisma.item.findMany({ where: { accountId, shopId }, select: { name: true } }),
  ]);
  const taken = new Set(inStore.map((item) => item.name));
  return items.filter((item) => !taken.has(item.name));
}

export function findItem(accountId: string, itemId: string) {
  if (!isObjectId(itemId)) return Promise.resolve(null);
  return prisma.item.findFirst({ where: { id: itemId, accountId } });
}

export function createItem(accountId: string, input: CreateItemInput) {
  return prisma.item.create({ data: { accountId, shopId: null, ...input } }).catch(rethrowNameTaken);
}

/**
 * إضافة صنف من أصناف النشاط لمتجر: نسخة كاملة منه بنفس البيانات، والفرق إنها
 * تبع المتجر ده. العميل طلبها نسخة مستقلة مش إشارة للأصل، عشان سعر الصنف
 * ومعدل بيعه (rate) بيختلفوا من فرع لفرع.
 *
 * بيرجّع null لو الصنف مش موجود أو مش صنف نشاط (يعني نسخة متجر تانية).
 */
export async function copyItemToStore(accountId: string, itemId: string, shopId: string) {
  const item = await findItem(accountId, itemId);
  if (!item || item.shopId !== null) return null;

  const { id: _id, accountId: _accountId, shopId: _shopId, ...fields } = item;
  return prisma.item.create({ data: { ...fields, accountId, shopId } }).catch(rethrowNameTaken);
}

export async function updateItem(accountId: string, itemId: string, input: UpdateItemInput) {
  if (!(await findItem(accountId, itemId))) return null;
  return prisma.item.update({ where: { id: itemId }, data: input }).catch(rethrowNameTaken);
}

export async function deleteItem(accountId: string, itemId: string): Promise<boolean> {
  if (!(await findItem(accountId, itemId))) return false;
  await prisma.item.delete({ where: { id: itemId } });
  return true;
}
