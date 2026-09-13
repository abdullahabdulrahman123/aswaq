import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { isObjectId } from '../schemas/common.js';
import type { CreateItemInput, UpdateItemInput } from '../schemas/item.schema.js';
import { findShop } from './shop.service.js';

/** فيه صنف بنفس الاسم في نفس المستوى (النشاط أو نفس المحل) — بيتترجم لـ409 */
export class ItemNameTakenError extends Error {
  constructor() {
    super('Item name already used');
    this.name = 'ItemNameTakenError';
  }
}

/** الـshopId في الطلب مش محل تبع النشاط ده */
export class ShopNotFoundError extends Error {
  constructor() {
    super('Shop not found');
    this.name = 'ShopNotFoundError';
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

/** shopId = null → أصناف النشاط نفسه · shopId = id → نسخ المحل ده */
export function listItems(accountId: string, shopId: string | null) {
  return prisma.item.findMany({ where: { accountId, shopId }, orderBy: { name: 'asc' } });
}

export function findItem(accountId: string, itemId: string) {
  if (!isObjectId(itemId)) return Promise.resolve(null);
  return prisma.item.findFirst({ where: { id: itemId, accountId } });
}

export async function createItem(accountId: string, input: CreateItemInput) {
  if (input.shopId && !(await findShop(accountId, input.shopId))) throw new ShopNotFoundError();
  return prisma.item.create({ data: { accountId, ...input } }).catch(rethrowNameTaken);
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
