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
  cancelled: 'ملغية',
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

/** «مهامي»: المفتوح — اتأكد ولسه متمش ولا اتلغى، في أي مرحلة */
export const isOpenState = (state: string) => state !== 'draft' && state !== 'done' && state !== 'cancelled';

/**
 * الطلب بقى فاتورة (رسالة العميل ٨ أكتوبر: draft ← order ← invoice) — دخلت الحسابات ومبتتعدّلش
 * ولا بتتلغي: «ينفع اعدلها بعد العميل ما يستلم؟ لا طبعاً». التصحيح بعدها «مردود بيع»
 */
export const isInvoice = (order: Pick<Order, 'kind'>) => order.kind === 'invoice';

type Numbered = Pick<Order, 'state' | 'kind' | 'number' | 'draftNumber' | 'invoiceNumber'>;

/**
 * الأوردر بحالته ورقمها (مكالمة ٨ أكتوبر: مسلسل لكل حالة) — مسودة ← طلب ← فاتورة. الرقم
 * null = مسودة قبل المسلسلات (أو على الجهاز بس)
 */
export function stateNumberOf(order: Numbered): { label: 'مسودة' | 'طلب' | 'فاتورة'; number: number | null } {
  if (order.state === 'draft') return { label: 'مسودة', number: order.draftNumber ?? null };
  if (isInvoice(order) && order.invoiceNumber != null) return { label: 'فاتورة', number: order.invoiceNumber };
  return { label: 'طلب', number: order.number };
}

/** «فاتورة 25» / «طلب 20» / «مسودة 7» — و«رقم» في النص: «فاتورة رقم 25» */
export function stateNumber(order: Numbered, withWord = false): string {
  const { label, number } = stateNumberOf(order);
  return number == null ? label : `${label} ${withWord ? 'رقم ' : ''}${number}`;
}

/** المرجع الكبير («البيج سيريال») — «#1727». null = لسه ملوش */
export const serialTag = (order: Pick<Order, 'serial'>) => (order.serial != null ? `#${order.serial}` : null);

/** الفاتورة المؤكدة لسه بتتعدّل وبتتلغي: مفتوحة ولسه مبقتش فاتورة */
export const isEditable = (order: Pick<Order, 'state' | 'kind'>) => isOpenState(order.state) && !isInvoice(order);

/** ليه الفاتورة المؤكدة مبقتش بتتعدّل */
export const closedMessage = (order: Pick<Order, 'state' | 'kind'>) =>
  order.state === 'cancelled'
    ? 'الفاتورة دي اتلغت ومبقتش بتتعدّل.'
    : isOpenState(order.state) && isInvoice(order)
      ? 'دي بقت فاتورة ومبقتش بتتعدّل ولا بتتلغي — التصحيح بعد كده «مردود بيع».'
      : 'الفاتورة دي خلصت ومبقتش بتتعدّل.';
