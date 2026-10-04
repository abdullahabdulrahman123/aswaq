import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { STAGE_TEMPLATE, salesStagesOf } from '../services/orderFlow.js';
import { CATEGORIES, listPermissions } from '../services/permissions.js';

/**
 * إعدادات النشاط (مكالمة ٢ أكتوبر) — على الشركة كلها. أي حد في الشركة بيشوفها،
 * وصاحب الشركة بس اللي بيغيّرها. أول إعداد: مراحل البيع من القالب، بالترتيب.
 */
const settingsSchema = z.object({
  salesStages: z
    .array(z.enum(STAGE_TEMPLATE.map((s) => s.key) as [string, ...string[]]))
    .max(STAGE_TEMPLATE.length)
    .refine((keys) => new Set(keys).size === keys.length, 'Each stage once'),
});

export async function get(req: Request, res: Response) {
  res.json({ settings: { salesStages: await salesStagesOf(req.business!.accountId) }, stageTemplate: STAGE_TEMPLATE });
}

export async function update(req: Request, res: Response) {
  if ((req.business!.job ?? 'owner') !== 'owner') {
    res.status(403).json({ message: 'Only the business owner changes the settings' });
    return;
  }
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const businessId = req.business!.accountId;
  const row = await prisma.businessSettings.upsert({
    where: { businessId },
    create: { businessId, salesStages: parsed.data.salesStages },
    update: { salesStages: parsed.data.salesStages },
  });
  res.json({ settings: { salesStages: row.salesStages }, stageTemplate: STAGE_TEMPLATE });
}

/** GET /api/permissions — رصيد الصلاحيات وأقسامها، لصفحة «الموظفين» */
export async function permissions(_req: Request, res: Response) {
  const list = await listPermissions();
  res.json({
    permissions: list.map((p) => ({ key: p.key, name: p.name, categories: p.categories, defaultOn: p.defaultOn })),
    categories: CATEGORIES,
  });
}
