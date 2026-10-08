import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { FIXED_COLORS, STAGE_COLOR_CHOICES, STAGE_TEMPLATE, invoiceStageOf, stageColorsOf } from '../services/orderFlow.js';
import { CATEGORIES, listPermissions } from '../services/permissions.js';

/**
 * إعدادات النشاط (مكالمة ٢ أكتوبر) — على الشركة كلها. أي حد في الشركة بيشوفها،
 * وصاحب الشركة بس اللي بيغيّرها. أول إعداد: مراحل البيع من القالب، بالترتيب.
 */
const stageKey = z.enum(STAGE_TEMPLATE.map((s) => s.key) as [string, ...string[]]);
const settingsSchema = z
  .object({
    salesStages: z
      .array(stageKey)
      .max(STAGE_TEMPLATE.length)
      .refine((keys) => new Set(keys).size === keys.length, 'Each stage once'),
    /** لون كل مرحلة (رسالة العميل ٦ أكتوبر) — اللي مش مبعوت بيفضل زي ما هو */
    stageColors: z.record(stageKey, z.enum(STAGE_COLOR_CHOICES as [string, ...string[]])).optional(),
    /**
     * الطلب بيبقى فاتورة مع المرحلة دي (رسالة العميل ٨ أكتوبر): مرحلة من اللي اختارها أو done.
     * null = الافتراضي («تسليم» لو مفعّلة، وإلا «إتمام»)، ومش مبعوت = زي ما هو
     */
    invoiceStage: z.union([stageKey, z.literal('done')]).nullable().optional(),
  })
  .refine(({ salesStages, invoiceStage }) => !invoiceStage || invoiceStage === 'done' || salesStages.includes(invoiceStage), {
    message: 'The invoice stage must be one of the chosen stages',
    path: ['invoiceStage'],
  })
  // «ميبقاش لونين زي بعض»: المراحل اللي الشركة شغالة بيها، كل واحدة بلون
  .refine(
    ({ salesStages, stageColors }) => {
      const colors = salesStages.map((k) => stageColors?.[k]).filter(Boolean);
      return new Set(colors).size === colors.length;
    },
    { message: 'Each stage needs its own color', path: ['stageColors'] },
  );

/**
 * الإعدادات زي ما الواجهة بتعرضها: المراحل، ولون كل مرحلة، ومرحلة الفاتورة (اللي بتتطبّق
 * فعلاً — المختارة لو لسه من المراحل، وإلا الافتراضي)، والألوان المتاحة والثابتة
 */
function settingsView(row: { salesStages: string[]; stageColors: unknown; invoiceStage?: string | null } | null) {
  const salesStages = row?.salesStages ?? [];
  return {
    settings: { salesStages, stageColors: stageColorsOf(row?.stageColors ?? null), invoiceStage: invoiceStageOf(salesStages, row?.invoiceStage) },
    stageTemplate: STAGE_TEMPLATE,
    stageColorChoices: STAGE_COLOR_CHOICES,
    fixedColors: FIXED_COLORS,
  };
}

export async function get(req: Request, res: Response) {
  res.json(settingsView(await prisma.businessSettings.findUnique({ where: { businessId: req.business!.accountId } })));
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
  const current = await prisma.businessSettings.findUnique({ where: { businessId } });
  const stageColors = { ...stageColorsOf(current?.stageColors ?? null), ...(parsed.data.stageColors ?? {}) };
  // المحفوظ + الجديد مع بعض — مرحلة مختارة لونها الافتراضي ممكن يكون نفس اللي اتختار لمرحلة تانية
  const used = parsed.data.salesStages.map((k) => stageColors[k]);
  if (new Set(used).size !== used.length) {
    res.status(400).json({ message: 'Each stage needs its own color' });
    return;
  }
  const invoiceStage = parsed.data.invoiceStage === undefined ? (current?.invoiceStage ?? null) : parsed.data.invoiceStage;
  const row = await prisma.businessSettings.upsert({
    where: { businessId },
    create: { businessId, salesStages: parsed.data.salesStages, stageColors, invoiceStage },
    update: { salesStages: parsed.data.salesStages, stageColors, invoiceStage },
  });
  res.json(settingsView(row));
}

/** GET /api/permissions — رصيد الصلاحيات وأقسامها، لصفحة «الموظفين» */
export async function permissions(_req: Request, res: Response) {
  const list = await listPermissions();
  res.json({
    permissions: list.map((p) => ({ key: p.key, name: p.name, categories: p.categories, defaultOn: p.defaultOn })),
    categories: CATEGORIES,
  });
}
