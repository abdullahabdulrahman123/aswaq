import type { Request, Response } from 'express';
import type { StoreSettings } from '@prisma/client';
import { storeSettingsSchema } from '../schemas/item.schema.js';
import { listStoreSettings, saveStoreSettings, toMinimums } from '../services/store.service.js';
import { ensureStore } from './store.helpers.js';

/** إعدادات المتجر زي ما فورم المقر بيشوفها */
function toSettingsView(settings: StoreSettings) {
  return { shopId: settings.shopId, deliveryRadiusKm: settings.deliveryRadiusKm, minimums: toMinimums(settings) };
}

/** إعدادات كل متاجر النشاط — المتجر اللي ملوش صف لسه صاحبه محددش حاجة */
export async function listSettings(req: Request, res: Response) {
  const settings = await listStoreSettings(req.business!.accountId);
  res.json({ settings: settings.map(toSettingsView) });
}

/** بيتنادى من فورم المقر بعد ما وصلة تحفظ المقر نفسه */
export async function updateSettings(req: Request, res: Response) {
  const shopId = await ensureStore(req, res);
  if (!shopId) return;

  const parsed = storeSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }

  const settings = await saveStoreSettings(req.business!.accountId, shopId, parsed.data);
  res.json({ settings: toSettingsView(settings) });
}
