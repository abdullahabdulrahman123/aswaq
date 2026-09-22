import { z } from 'zod';
import { objectIdSchema } from './common.js';

/**
 * فلوس بالقرش كعدد صحيح — ٠.١ + ٠.٢ مبيساويش ٠.٣ في الأرقام العشرية،
 * ونفس الاتفاق اللي في الواجهة (client/src/lib/pricing.ts).
 * Int في Prisma مع MongoDB بـ٣٢ بت، فده أقصاه.
 */
const money = z.number().int().min(0).max(2_147_483_647);

const unitSchema = z.object({
  name: z.string().trim().min(1).max(40),
  /** كل الوحدات بالعدد: كام من أصغر وحدة */
  unitContent: z.number().int().min(1).max(1_000_000),
  /** متوسط تكلفة الوحدة — بيتكتب بإيد، غير avgCost بتاع الصنف */
  avgCost: money.nullable().default(null),
  rate: z.number().nullable().default(null),
  /** جرام وسم³ للوحدة الواحدة — لحساب حمولة العربية */
  weight: z.number().min(0).max(1_000_000_000).nullable().default(null),
  volume: z.number().min(0).max(1_000_000_000).nullable().default(null),
  onSWP: money.nullable().default(null),
  onSRP: money.nullable().default(null),
  onLWP: money.nullable().default(null),
  onLRP: money.nullable().default(null),
});

const unitsSchema = z
  .array(unitSchema)
  .min(1)
  .max(20)
  .superRefine((units, ctx) => {
    // الكميات كلها بتتحسب بأصغر وحدة، فلازم تكون موجودة (السكيمة: 1 = أصغر وحدة)
    if (!units.some((unit) => unit.unitContent === 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'One unit must have unitContent 1 (the smallest unit)',
      });
    }
    if (new Set(units.map((unit) => unit.name)).size !== units.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unit names must be unique' });
    }
  });

/** avgCost بتاع الصنف مش هنا عن قصد: بيتحسب من المشتريات، محدش بيكتبه */
const itemFields = {
  name: z.string().trim().min(1).max(120),
  picture: z.string().trim().url().max(2000).nullable().default(null),
  rate: z.number().default(0),
  isOwner: z.boolean().default(true),
  units: unitsSchema,
};

/**
 * الصنف بيتعمل على مستوى النشاط بس. نسخة المتجر مبتتعملش من هنا: بتتاخد من
 * صنف موجود بـ`POST /shops/:shopId/items` (شوف copyItemToStore).
 */
export const createItemSchema = z.object(itemFields);

export const updateItemSchema = z.object(itemFields);

/** إضافة صنف من أصناف النشاط لمتجر */
export const storeItemSchema = z.object({ itemId: objectIdSchema });

/** إعدادات المتجر. نطاق التوصيل بالكيلو، وnull = مبيوصّلش */
export const storeSettingsSchema = z.object({
  deliveryRadiusKm: z.number().positive().max(1000).nullable(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
