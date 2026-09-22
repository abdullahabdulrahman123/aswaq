import type { Request, Response } from 'express';
import type { Item } from '@prisma/client';
import { findShowroomStore, listDeliveryRadii } from '../services/store.service.js';

/**
 * الصنف زي ما المشتري بيشوفه في المتجر: اسمه وصورته ووحداته بأسعارها. من غير
 * التكلفة (avgCost) ولا معدل البيع (rate) — دول أسرار التاجر، والطلب ده لأي زائر.
 * الأسعار الأربعة كلها بتروح، والواجهة بتختار منها حسب الحساب وطريقة الاستلام.
 */
function toShowroomItem(item: Item) {
  return {
    id: item.id,
    name: item.name,
    picture: item.picture,
    units: item.units.map((unit) => ({
      name: unit.name,
      unitContent: unit.unitContent,
      onSWP: unit.onSWP ?? null,
      onSRP: unit.onSRP ?? null,
      onLWP: unit.onLWP ?? null,
      onLRP: unit.onLRP ?? null,
    })),
  };
}

/** نطاق توصيل كل المتاجر اللي بتوصّل — المتجر اللي مش في الليستة مبيوصّلش */
export async function listDelivery(_req: Request, res: Response) {
  res.json({ stores: await listDeliveryRadii() });
}

/**
 * صفحة متجر: نطاقه، والحد الأدنى للأوردر لكل شريحة سعر، وأصنافه. المتجر نفسه
 * (اسمه ونشاطه) من وصلة.
 */
export async function getStore(req: Request, res: Response) {
  const store = await findShowroomStore(String(req.params.shopId));
  if (!store) {
    res.status(404).json({ message: 'Store not found' });
    return;
  }
  res.json({
    store: { deliveryRadiusKm: store.deliveryRadiusKm, minimums: store.minimums, items: store.items.map(toShowroomItem) },
  });
}
