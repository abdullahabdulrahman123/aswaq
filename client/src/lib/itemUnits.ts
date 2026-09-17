import type { UnitKind } from './aswaqApi';

/**
 * أسماء وحدات الصنف وأسعاره زي ما بتظهر للمستخدم — فورم الصنف وصفحة الأصناف.
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

export const UNIT_KINDS: { value: UnitKind; label: string; examples: string }[] = [
  { value: 'COUNT', label: 'عدد', examples: 'قطعة، علبة…' },
  { value: 'WEIGHT', label: 'وزن', examples: 'كيلو، جرام…' },
  { value: 'VOLUME', label: 'حجم', examples: 'لتر، مللي…' },
];

/** وحدات اتحفظت قبل ما النوع يتضاف ملهاش kind — بتتعامل كعدد */
export const unitKindOf = (kind: UnitKind | null | undefined): UnitKind => kind ?? 'COUNT';

export const unitKindInfo = (kind: UnitKind) => UNIT_KINDS.find((k) => k.value === kind) ?? UNIT_KINDS[0];
