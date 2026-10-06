/**
 * ألوان المراحل (رسالة العميل ٦ أكتوبر: «هوية بصرية للحالة… وانت شايف الفواتير يبقى
 * يفصلي ان لون احمر اخضر ازرق»). السيرفر بيبعت مفتاح اللون مع كل أوردر (stateColor)
 * من إعدادات النشاط البائع — server/src/services/orderFlow.ts — والشكل هنا.
 *
 * الكلاسات مكتوبة كاملة عشان Tailwind يلاقيها.
 */
export interface StageColor {
  /** اسمه في الإعدادات */
  name: string;
  /** مربع رقم الفاتورة في «مهامي» — لون مليان وكتابة بيضا */
  box: string;
  /** شارة خفيفة — «فاتورة ٣ · بيتجهّز» في «طلباتي» */
  chip: string;
  /** كتابة بلون المرحلة — سطر الحالة في رأس «مبيعات» */
  text: string;
  /** دايرة اللون في الإعدادات */
  dot: string;
}

export const STAGE_COLORS: Record<string, StageColor> = {
  gray: {
    name: 'رمادي',
    box: 'bg-gray-500 text-white',
    chip: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
    text: 'text-gray-600 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  blue: {
    name: 'أزرق',
    box: 'bg-blue-600 text-white',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-600',
  },
  green: {
    name: 'أخضر',
    box: 'bg-green-600 text-white',
    chip: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-600',
  },
  red: {
    name: 'أحمر',
    box: 'bg-red-600 text-white',
    chip: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-600',
  },
  amber: {
    name: 'دهبي',
    box: 'bg-amber-500 text-white',
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  violet: {
    name: 'بنفسجي',
    box: 'bg-violet-600 text-white',
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-600',
  },
  orange: {
    name: 'برتقالي',
    box: 'bg-orange-600 text-white',
    chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-600',
  },
  teal: {
    name: 'تركواز',
    box: 'bg-teal-600 text-white',
    chip: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-600',
  },
  pink: {
    name: 'وردي',
    box: 'bg-pink-600 text-white',
    chip: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
    text: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-600',
  },
  lime: {
    name: 'زيتوني',
    box: 'bg-lime-700 text-white',
    chip: 'bg-lime-50 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
    text: 'text-lime-800 dark:text-lime-300',
    dot: 'bg-lime-700',
  },
  brown: {
    name: 'بني',
    box: 'bg-[#8a5a2b] text-white',
    chip: 'bg-[#f6eee6] text-[#7a4d22] dark:bg-[#8a5a2b]/25 dark:text-[#e3c4a3]',
    text: 'text-[#7a4d22] dark:text-[#e3c4a3]',
    dot: 'bg-[#8a5a2b]',
  },
};

/** لون المرحلة — من السيرفر، وإلا على حسب الحالة الثابتة (أوردرات قبل الألوان) */
export function stageColor(order: { state: string; stateColor?: string }): StageColor {
  const fallback = order.state === 'cancelled' ? 'red' : order.state === 'done' ? 'green' : order.state === 'draft' ? 'gray' : 'blue';
  return STAGE_COLORS[order.stateColor ?? ''] ?? STAGE_COLORS[fallback];
}
