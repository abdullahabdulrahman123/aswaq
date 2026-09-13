import type { Request, Response } from 'express';
import type { Item } from '@prisma/client';
import { isObjectId } from '../schemas/common.js';
import { createItemSchema, updateItemSchema } from '../schemas/item.schema.js';
import {
  createItem,
  deleteItem,
  findItem,
  ItemNameTakenError,
  listItems,
  ShopNotFoundError,
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

/** نفس الرد لخطأين الـservice المتوقعين في الإنشاء والتعديل */
function handleItemError(err: unknown, res: Response): void {
  if (err instanceof ItemNameTakenError) {
    res.status(409).json({ message: 'An item with this name already exists here' });
    return;
  }
  if (err instanceof ShopNotFoundError) {
    res.status(400).json({ message: 'Shop not found in this business' });
    return;
  }
  throw err;
}

/** ?shopId=<id> → أصناف المحل ده · من غيره → أصناف النشاط نفسه */
export async function list(req: Request, res: Response) {
  const { shopId } = req.query;
  if (shopId !== undefined && (typeof shopId !== 'string' || !isObjectId(shopId))) {
    res.status(400).json({ message: 'Invalid shopId' });
    return;
  }
  const items = await listItems(req.business!.accountId, shopId ?? null);
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
