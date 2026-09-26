import { z } from 'zod';
import { objectIdSchema } from './common.js';

/** بيعة «مبيعات» زي ما الواجهة شايلاها — بتتحفظ مع الأوردر عشان ترجع على جهاز تاني */
const saleSchema = z
  .object({
    id: z.string().min(1).max(40),
    accountId: objectIdSchema,
    buyer: z.object({
      accountId: objectIdSchema,
      kind: z.enum(['user', 'business']),
      name: z.string().max(120),
    }).passthrough(),
    buyerName: z.string().trim().max(80).default(''),
    phone: z.string().trim().regex(/^\+?\d{0,15}$/).default(''),
    sellerName: z.string().max(120).default(''),
    method: z.enum(['pickup', 'delivery']),
    address: z.string().trim().max(200).default(''),
  })
  .passthrough();

/**
 * المسودة من السلة: المتجر والسطور بالكمية بس — الأسعار والإجماليات السيرفر
 * هو اللي بيحسبها. مفيش sale = المستخدم بيشتري لنفسه (أو لنشاطه: to).
 */
export const draftSchema = z.object({
  shopId: objectIdSchema,
  method: z.enum(['pickup', 'delivery']),
  /** للمستخدم لنفسه: حسابه أو واحد من أنشطته. في البيعة بيتاخد من sale */
  to: objectIdSchema.optional(),
  sale: saleSchema.optional(),
  lines: z
    .array(
      z.object({
        itemId: objectIdSchema,
        unitName: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(99_999),
      }),
    )
    .max(200),
});

export type DraftInput = z.infer<typeof draftSchema>;
