import { Prisma, type Item } from '@prisma/client';
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

/**
 * وحدات الصنف زي ما هتتحفظ: الوحدة اللي جاية من غير تشيكات (فورم الصنف) بتاخد
 * المحفوظة لنفس الاسم، والجديدة بتتباع في كله
 */
function withHiddenIn(units: CreateItemInput['units'], current: Item['units'] = []): Item['units'] {
  const saved = new Map(current.map((u) => [u.name, u.hiddenIn ?? []]));
  return units.map((u) => ({ ...u, hiddenIn: u.hiddenIn ?? saved.get(u.name) ?? [] }));
}

export function createItem(accountId: string, input: CreateItemInput) {
  return prisma.item.create({ data: { accountId, shopId: null, ...input, units: withHiddenIn(input.units) } }).catch(rethrowNameTaken);
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

  const { id: _id, accountId: _accountId, shopId: _shopId, sourceItemId: _source, ...fields } = item;
  return prisma.item.create({ data: { ...fields, accountId, shopId, sourceItemId: item.id } }).catch(rethrowNameTaken);
}

type Unit = Item['units'][number];

/** الأسعار — البيانات الوحيدة اللي كل متجر بيغيّرها براحته، بطلب العميل */
const PRICE_KEYS = ['onSWP', 'onSRP', 'onLWP', 'onLRP'] as const;
const pricesOf = (unit: Unit) => Object.fromEntries(PRICE_KEYS.map((k) => [k, unit[k] ?? null])) as Pick<Unit, (typeof PRICE_KEYS)[number]>;

/**
 * نسخة متجر بعد ما الأصل اتعدّل: كل البيانات الأساسية من الأصل (الاسم والصورة
 * والوحدات ومحتواها وتكلفتها ووزنها وحجمها)، والأسعار ومعدل البيع (rate) من
 * النسخة. الوحدة بتتعرف باسمها — وحدة جديدة في الأصل (زي «جرام») بتنزل
 * بأسعار الأصل لحد ما المتجر يغيّرها، ووحدة اتشالت من الأصل بتتشال.
 */
function followSource(source: Item, copy: Item) {
  const copyUnits = new Map(copy.units.map((u) => [u.name, u]));
  return {
    name: source.name,
    picture: source.picture,
    isOwner: source.isOwner,
    units: source.units.map((u) => {
      const mine = copyUnits.get(u.name);
      return { ...u, ...(mine ? { ...pricesOf(mine), rate: mine.rate ?? null } : {}) };
    }),
  };
}

/**
 * تعديل صنف. الأصل: بيتحفظ، وبياناته الأساسية بتتعمم على كل نسخه في المتاجر،
 * بطلب العميل: «أي تعديل في البيانات الأساسية هيتعمم على النسخ التانية».
 * النسخة: الأسعار ومعدل البيع بس — الباقي بييجي من الأصل ومبيتغيّرش من هنا.
 */
export async function updateItem(accountId: string, itemId: string, input: UpdateItemInput) {
  const current = await findItem(accountId, itemId);
  if (!current) return null;

  const source = current.sourceItemId ? await prisma.item.findUnique({ where: { id: current.sourceItemId } }) : null;
  if (source) {
    const incoming = new Map(input.units.map((u) => [u.name, u]));
    const prices = { ...current, units: current.units.map((u) => ({ ...u, ...(incoming.has(u.name) ? { ...pricesOf(incoming.get(u.name) as Unit), rate: incoming.get(u.name)!.rate } : {}) })) };
    return prisma.item.update({ where: { id: itemId }, data: { ...followSource(source, prices), rate: input.rate } });
  }

  const saved = await prisma.item
    .update({ where: { id: itemId }, data: { ...input, units: withHiddenIn(input.units, current.units) } })
    .catch(rethrowNameTaken);
  if (current.shopId === null) await syncCopies(saved);
  return saved;
}

/** البيانات الأساسية للأصل بتنزل على كل نسخه في المتاجر — والأسعار بتفضل بتاعة كل متجر */
async function syncCopies(source: Item) {
  const copies = await prisma.item.findMany({ where: { sourceItemId: source.id } });
  for (const copy of copies) {
    await prisma.item.update({ where: { id: copy.id }, data: followSource(source, copy) }).catch((err) => {
      // اسم الأصل الجديد موجود قبل كده كصنف تاني في المتجر ده — النسخة دي بتفضل باسمها القديم
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return prisma.item.update({ where: { id: copy.id }, data: { ...followSource(source, copy), name: copy.name } });
      }
      throw err;
    });
  }
}

/**
 * تشيكات وحدة في كارت الصنف (مكالمة ٦ أكتوبر): المنافذ اللي مبتتباعش فيها، على صنف
 * النشاط — وبتنزل على نسخه في كل المتاجر زي الاسم والوحدات. null = الصنف أو الوحدة
 * مش موجودين، أو ده نسخة متجر (التشيكات من الأصل بس).
 */
export async function setUnitHiddenIn(accountId: string, itemId: string, unitName: string, hiddenIn: string[]) {
  const current = await findItem(accountId, itemId);
  if (!current || current.shopId !== null || !current.units.some((u) => u.name === unitName)) return null;
  const saved = await prisma.item.update({
    where: { id: itemId },
    data: { units: current.units.map((u) => (u.name === unitName ? { ...u, hiddenIn } : { ...u, hiddenIn: u.hiddenIn ?? [] })) },
  });
  await syncCopies(saved);
  return saved;
}

/**
 * نسخ المتاجر اللي اتعملت قبل الربط بالأصل (قبل ٢٧ سبتمبر) — بتتربط بالأصل
 * اللي بنفس الاسم في نفس النشاط، أول ما السيرفر يقوم. مرة واحدة فعلياً.
 */
export async function linkStoreCopiesToSources(): Promise<number> {
  const copies = await prisma.item.findMany({
    where: { shopId: { not: null }, OR: [{ sourceItemId: null }, { sourceItemId: { isSet: false } }] },
    select: { id: true, accountId: true, name: true },
  });
  let linked = 0;
  for (const copy of copies) {
    const source = await prisma.item.findFirst({ where: { accountId: copy.accountId, shopId: null, name: copy.name }, select: { id: true } });
    if (!source) continue;
    await prisma.item.update({ where: { id: copy.id }, data: { sourceItemId: source.id } });
    linked++;
  }
  return linked;
}

export async function deleteItem(accountId: string, itemId: string): Promise<boolean> {
  if (!(await findItem(accountId, itemId))) return false;
  await prisma.item.delete({ where: { id: itemId } });
  return true;
}
