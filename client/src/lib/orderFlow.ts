import type { Order } from './aswaqApi';

/**
 * مراحل الأوردر — مكالمة ١ أكتوبر: زرار واحد بينقل الأوردر مرحلة مرحلة واسمه
 * بيتغيّر، وآخرها «إتمام». مكالمة ٢ أكتوبر: اللي في النص كل نشاط بيختاره في
 * «الإعدادات»، فالسيرفر بيبعت اسم المرحلة (stateLabel) وزرار اللي بعدها
 * (nextAction) مع كل أوردر (server/src/services/orderFlow.ts). الأسماء هنا
 * للثابت بس، لو الرد جه من غيرهم.
 */
const FIXED_LABELS: Record<string, string> = {
  draft: 'مسودة',
  order: 'مؤكد',
  done: 'مكتمل',
};

const FIXED_NEXT: Record<string, string> = {
  draft: 'تأكيد',
  order: 'إتمام',
};

/** اسم المرحلة على الفاتورة وفي الليستات */
export const stageLabel = (order: Pick<Order, 'state' | 'stateLabel'>) => order.stateLabel ?? FIXED_LABELS[order.state] ?? order.state;

/** اسم الزرار اللي بينقل الأوردر للمرحلة اللي بعدها — undefined = آخر مرحلة */
export const nextActionOf = (order: Pick<Order, 'state' | 'nextAction'>) =>
  (order.nextAction === undefined ? FIXED_NEXT[order.state] : order.nextAction) ?? undefined;

/** زرار «تأكيد» على المسودة */
export const CONFIRM_ACTION = FIXED_NEXT.draft;

/** «مهامي»: المفتوح — اتأكد ولسه متمش، في أي مرحلة */
export const isOpenState = (state: string) => state !== 'draft' && state !== 'done';
