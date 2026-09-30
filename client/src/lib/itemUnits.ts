import type { AccountType } from './pricing';

/**
 * أسماء أسعار الصنف زي ما بتظهر للمستخدم — فورم الصنف وصفحة الأصناف.
 */

/** الأسعار الأربعة — S في المحل و L أونلاين، W جملة و R قطاعي */
export const PRICE_FIELDS = ['onSWP', 'onSRP', 'onLWP', 'onLRP'] as const;
export type PriceField = (typeof PRICE_FIELDS)[number];

export const PRICE_LABELS: Record<PriceField, string> = {
  onSWP: 'جملة محل',
  onSRP: 'قطاعي محل',
  onLWP: 'جملة أونلاين',
  onLRP: 'قطاعي أونلاين',
};

/**
 * الأسعار متجمّعة زي الفورم: المحل لوحده والأونلاين لوحده. الأربعة في صف واحد
 * على الموبايل، فالاسم جوه الخانة «جملة» أو «قطاعي» بس وفوقهم اسم المجموعة.
 */
export const PRICE_GROUPS: { label: string; fields: { field: PriceField; label: string }[] }[] = [
  {
    label: 'في المحل',
    fields: [
      { field: 'onSWP', label: 'جملة' },
      { field: 'onSRP', label: 'قطاعي' },
    ],
  },
  {
    label: 'أونلاين',
    fields: [
      { field: 'onLWP', label: 'جملة' },
      { field: 'onLRP', label: 'قطاعي' },
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
