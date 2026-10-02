/**
 * مراحل الأوردر — مكالمة ١ أكتوبر: زرار واحد («تأكيد») بينقل الأوردر مرحلة
 * مرحلة واسمه بيتغيّر، وآخرها «إتمام». دلوقتي مرحلتين بعد المسودة؛ المراحل
 * اللي في النص (تجهيز، توصيل…) بتتضاف هنا لما العميل يحددها — ونفس الليستة
 * في الواجهة (client/src/lib/orderFlow.ts).
 *
 * draft ← order بيحصل بـcheckout (رقم الفاتورة)، والباقي بـadvance.
 */
export const ORDER_STATES = ['draft', 'order', 'done'] as const;
export type OrderState = (typeof ORDER_STATES)[number];

/** المرحلة اللي بعد دي — null = آخر مرحلة (مكتمل) */
export function nextState(state: string): OrderState | null {
  const i = ORDER_STATES.indexOf(state as OrderState);
  return i >= 0 && i < ORDER_STATES.length - 1 ? ORDER_STATES[i + 1] : null;
}

/** «مهامي»: الأوردرات المفتوحة — اتأكدت ولسه متمتش */
export const OPEN_STATES: OrderState[] = ['order'];
