import { z } from 'zod';
import { objectIdSchema } from './common.js';

/**
 * ميعاد التسليم وملاحظاته (رسالة العميل ٦ أكتوبر) — في رأس البيعة، وللمشتري من المعرض
 * جنب طريقة الاستلام. الميعاد ISO بالمنطقة الزمنية؛ فاضي = مش متحدد
 */
const deliveryFields = {
  deliveryAt: z.string().datetime({ offset: true }).nullable().optional(),
  deliveryNotes: z.string().trim().max(300).optional(),
};

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
    ...deliveryFields,
  })
  .passthrough();

/** سعر كتبه البائع في «مبيعات» (مكالمة ٢٨ سبتمبر) — بالقرش */
const sellerPrice = z.number().int().min(0).max(100_000_000).optional();

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
  /** للمشتري من المعرض — في البيعة بيتاخدوا من sale */
  ...deliveryFields,
  lines: z
    .array(
      z.object({
        itemId: objectIdSchema,
        unitName: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(99_999),
        /** سعر الوحدة بالقرش اللي البائع كتبه — في «مبيعات» بس، وغير كده بيتجاهل */
        price: sellerPrice,
      }),
    )
    .max(200),
});

/**
 * صنف واحد في مسودة موجودة — بطلب العميل الحفظ صنف صنف، والهيدر مبيتبعتش
 * كل مرة. الكمية صفر = الصنف يتشال.
 */
export const lineSchema = z.object({
  itemId: objectIdSchema,
  unitName: z.string().min(1).max(40),
  quantity: z.number().int().min(0).max(99_999),
  price: sellerPrice,
});

/**
 * رأس فاتورة مؤكدة (رسالة العميل ٦ أكتوبر: «اكسباند الجزء اللي فيه مستخدم غير مسجل
 * وأعدّل الهيدر زي زمان») — نفس خانات رأس البيعة من غير المتجر. طلب المعرض
 * المشتري بتاعه مبيتغيّرش.
 */
export const headerSchema = saleSchema.omit({ id: true, accountId: true });

/** إلغاء فاتورة (مكالمة ٥ أكتوبر): السبب لازم يتكتب */
export const cancelSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});

/** «تراجع» (مكالمة العميل ٩ أكتوبر): المرحلة اللي الطلب يرجعلها */
export const backSchema = z.object({
  to: z.string().min(1).max(40),
});

export type DraftInput = z.infer<typeof draftSchema>;
export type HeaderInput = z.infer<typeof headerSchema>;
export type LineInput = z.infer<typeof lineSchema>;
