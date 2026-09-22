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

/** طريقة الاستلام — «في المحل» يعني المشتري بيستلم من المتجر، و«أونلاين» يعني توصيل */
export type ReceivingMethod = 'pickup' | 'delivery';

/**
 * السعر اللي المشتري بيشوفه في المتجر، بطلب العميل: الشركة بتشوف الجملة،
 * والحساب الشخصي والزائر القطاعي. والاستلام من المتجر بسعر المحل، والتوصيل
 * بسعر الأونلاين. كلمة جملة أو قطاعي مبتظهرش للمشتري نفسه — بيشوف «السعر» بس.
 */
export function buyerPriceField(method: ReceivingMethod, accountType: AccountType): PriceField {
  const wholesale = accountType === 'COMPANY';
  if (method === 'pickup') return wholesale ? 'onSWP' : 'onSRP';
  return wholesale ? 'onLWP' : 'onLRP';
}
