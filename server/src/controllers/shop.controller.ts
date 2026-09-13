import type { Request, Response } from 'express';
import type { Shop } from '@prisma/client';
import { findManagedBusiness } from '../middleware/auth.js';
import { shopSchema, type ShopInput } from '../schemas/shop.schema.js';
import { createShop, deleteShop, listShops, updateShop } from '../services/shop.service.js';

/*
 * req.business بيتحط في requireBusinessAccess بعد ما وصلة أكّدت إن المستخدم
 * بيدير النشاط، فبناخد منه الـaccountId بدل req.params.
 */

function toShopView(shop: Shop) {
  return { id: shop.id, accountId: shop.accountId, name: shop.name, addressId: shop.addressId };
}

/**
 * العنوان عايش في وصلة، فمفيش فهرس هنا يتأكد منه — بنتأكد إنه من
 * عناوين النشاط ده في رد وصلة. بيرجّع false بعد ما يرد بـ400.
 */
async function ensureAddressBelongs(req: Request, res: Response, input: ShopInput): Promise<boolean> {
  const { addressId } = input;
  if (!addressId) return true;

  const business = await findManagedBusiness(req, req.business!.accountId, (b) =>
    b.addresses.some((address) => address.id === addressId),
  );
  if (business) return true;

  res.status(400).json({ message: 'Address not found in this business' });
  return false;
}

export async function list(req: Request, res: Response) {
  const shops = await listShops(req.business!.accountId);
  res.json({ shops: shops.map(toShopView) });
}

export async function create(req: Request, res: Response) {
  const parsed = shopSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  if (!(await ensureAddressBelongs(req, res, parsed.data))) return;

  const shop = await createShop(req.business!.accountId, parsed.data);
  res.status(201).json({ shop: toShopView(shop) });
}

export async function update(req: Request, res: Response) {
  const parsed = shopSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  if (!(await ensureAddressBelongs(req, res, parsed.data))) return;

  const shop = await updateShop(req.business!.accountId, String(req.params.shopId), parsed.data);
  if (!shop) {
    res.status(404).json({ message: 'Shop not found' });
    return;
  }
  res.json({ shop: toShopView(shop) });
}

export async function remove(req: Request, res: Response) {
  if (!(await deleteShop(req.business!.accountId, String(req.params.shopId)))) {
    res.status(404).json({ message: 'Shop not found' });
    return;
  }
  res.status(204).send();
}
