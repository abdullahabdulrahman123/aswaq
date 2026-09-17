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
  /** ممكن كسر: الوحدة ممكن تكون وزن أو حجم (نص كيلو = 0.5) */
  unitContent: z.number().positive().max(1_000_000),
  /** متوسط تكلفة الوحدة — بيتكتب بإيد، غير avgCost بتاع الصنف */
  avgCost: money.nullable().default(null),
  rate: z.number().nullable().default(null),
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

/** shopId بيتحدد مرة وقت الإنشاء: نسخة المحل صف مستقل، مش صنف بيتنقل */
export const createItemSchema = z.object({
  ...itemFields,
  shopId: objectIdSchema.nullable().default(null),
});

export const updateItemSchema = z.object(itemFields);

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
