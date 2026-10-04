import type { AccountType } from './pricing';

/**
 * أسماء أسعار الصنف زي ما بتظهر للمستخدم — فورم الصنف وصفحة الأصناف.
 */

/**
 * الأسعار الأربعة — S في المحل و L أونلاين، W جملة و R قطاعي. الجملة الأول
 * وبعدها القطاعي، كل واحد محل وأونلاين جنب بعض (مكالمة ٢ أكتوبر)
 */
export const PRICE_FIELDS = ['onSWP', 'onLWP', 'onSRP', 'onLRP'] as const;
export type PriceField = (typeof PRICE_FIELDS)[number];

export const PRICE_LABELS: Record<PriceField, string> = {
  onSWP: 'جملة محل',
  onSRP: 'قطاعي محل',
  onLWP: 'جملة أونلاين',
  onLRP: 'قطاعي أونلاين',
};

/**
 * الأسعار متجمّعة في فورم الصنف و«التسعير»: الجملة لوحدها والقطاعي لوحده،
 * بطلب العميل (مكالمة ٢ أكتوبر) — «الأولوية عندي جملة وقطاعي»، وأسهل للي بيحط
 * الأسعار. المحل والأونلاين ملهمش علاقة بالاستلام والتوصيل. الأربعة في صف
 * واحد على الموبايل، فالاسم جوه الخانة «محل» أو «أونلاين» بس وفوقهم اسم المجموعة.
 */
export const PRICE_GROUPS: { label: string; fields: { field: PriceField; label: string }[] }[] = [
  {
    label: 'جملة',
    fields: [
      { field: 'onSWP', label: 'محل' },
      { field: 'onLWP', label: 'أونلاين' },
    ],
  },
  {
    label: 'قطاعي',
    fields: [
      { field: 'onSRP', label: 'محل' },
      { field: 'onLRP', label: 'أونلاين' },
    ],
  },
];

/** طريقة الاستلام — استلام من المتجر أو توصيل لعنوان */
export type ReceivingMethod = 'pickup' | 'delivery';

/**
 * السعر اللي المشتري بيشوفه في المتجر، بطلب العميل: الشركة بتشوف الجملة،
 * والحساب الشخصي والزائر القطاعي. «مبيعات» (فاتورة بيحررها البائع في المحل)
 * بسعر المحل، والمعرض بسعر الأونلاين — والاستلام والتوصيل مبيغيّروش السعر
 * (مكالمة ٢٨ سبتمبر: تكلفة التوصيل خطوة لوحدها بعد التأكيد). كلمة جملة أو
 * قطاعي مبتظهرش للمشتري نفسه — بيشوف «السعر» بس.
 */
export function buyerPriceField(inSales: boolean, accountType: AccountType): PriceField {
  const wholesale = accountType === 'COMPANY';
  if (inSales) return wholesale ? 'onSWP' : 'onSRP';
  return wholesale ? 'onLWP' : 'onLRP';
}
