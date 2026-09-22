import type { Request, Response } from 'express';
import type { Item } from '@prisma/client';
import { createItemSchema, storeItemSchema, updateItemSchema } from '../schemas/item.schema.js';
import { ensureStore } from './store.helpers.js';
import {
  copyItemToStore,
  createItem,
  deleteItem,
  findItem,
  ItemNameTakenError,
  listItems,
  listItemsNotInStore,
  updateItem,
} from '../services/item.service.js';

/*
 * req.business بيتحط في requireBusinessAccess بعد ما وصلة أكّدت إن المستخدم
 * بيدير النشاط، فبناخد منه الـaccountId بدل req.params.
 */

function toItemView(item: Item) {
  return {
    id: item.id,
    accountId: item.accountId,
    shopId: item.shopId,
    name: item.name,
    picture: item.picture,
    avgCost: item.avgCost,
    rate: item.rate,
    isOwner: item.isOwner,
    units: item.units,
  };
}

/** الاسم اتكرر في نفس المستوى — نفس الرد في الإنشاء والتعديل والإضافة لمتجر */
function handleItemError(err: unknown, res: Response): void {
  if (err instanceof ItemNameTakenError) {
    res.status(409).json({ message: 'An item with this name already exists here' });
    return;
  }
  throw err;
}

/** أصناف النشاط نفسه (مستوى الشركة) */
export async function list(req: Request, res: Response) {
  const items = await listItems(req.business!.accountId, null);
  res.json({ items: items.map(toItemView) });
}

export async function get(req: Request, res: Response) {
  const item = await findItem(req.business!.accountId, String(req.params.itemId));
  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }
  res.json({ item: toItemView(item) });
}

export async function create(req: Request, res: Response) {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }

  try {
    const item = await createItem(req.business!.accountId, parsed.data);
    res.status(201).json({ item: toItemView(item) });
  } catch (err) {
    handleItemError(err, res);
  }
}

export async function update(req: Request, res: Response) {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }

  try {
    const item = await updateItem(req.business!.accountId, String(req.params.itemId), parsed.data);
    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }
    res.json({ item: toItemView(item) });
  } catch (err) {
    handleItemError(err, res);
  }
}

export async function remove(req: Request, res: Response) {
  if (!(await deleteItem(req.business!.accountId, String(req.params.itemId)))) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }
  res.status(204).send();
}

/** أصناف المتجر ده — نسخه هو */
export async function listInStore(req: Request, res: Response) {
  const shopId = await ensureStore(req, res);
  if (!shopId) return;

  const items = await listItems(req.business!.accountId, shopId);
  res.json({ items: items.map(toItemView) });
}

/** أصناف النشاط اللي لسه مضافتش للمتجر ده — اللي بتتحط في كومبو الإضافة */
export async function listAvailableForStore(req: Request, res: Response) {
  const shopId = await ensureStore(req, res);
  if (!shopId) return;

  const items = await listItemsNotInStore(req.business!.accountId, shopId);
  res.json({ items: items.map(toItemView) });
}

/** إضافة صنف من أصناف النشاط للمتجر — نسخة منه بنفس بياناته */
export async function addToStore(req: Request, res: Response) {
  const shopId = await ensureStore(req, res);
  if (!shopId) return;

  const parsed = storeItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }

  try {
    const item = await copyItemToStore(req.business!.accountId, parsed.data.itemId, shopId);
    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }
    res.status(201).json({ item: toItemView(item) });
  } catch (err) {
    handleItemError(err, res);
  }
}
