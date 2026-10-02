/**
 * مراحل الأوردر — مكالمة ١ أكتوبر: زرار واحد بينقل الأوردر مرحلة مرحلة واسمه
 * بيتغيّر، وآخرها «إتمام». نفس الليستة في السيرفر (server/src/services/orderFlow.ts).
 * المراحل اللي في النص بتتضاف هنا وهناك لما العميل يحددها.
 */
export const ORDER_STATES = ['draft', 'order', 'done'] as const;
export type OrderState = (typeof ORDER_STATES)[number];

/** اسم المرحلة على الفاتورة وفي الليستات */
export const STATE_LABELS: Record<string, string> = {
  draft: 'مسودة',
  order: 'مؤكد',
  done: 'مكتمل',
};

/** اسم الزرار اللي بينقل الأوردر من المرحلة دي للي بعدها — مفيش = آخر مرحلة */
export const NEXT_ACTION: Record<string, string> = {
  draft: 'تأكيد',
  order: 'إتمام',
};

/** «مهامي»: المفتوح — اتأكد ولسه متمش */
export const isOpenState = (state: string) => state === 'order';
