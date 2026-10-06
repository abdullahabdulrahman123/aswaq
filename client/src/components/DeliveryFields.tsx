import type { MouseEvent } from 'react';
import { dayFieldLabel, fromLocalInput, toLocalInput, type Delivery } from '../lib/delivery';
import { Notch, compactFieldClass } from './OutlinedField';

/**
 * ميعاد التسليم وملاحظاته (رسالة العميل ٦ أكتوبر) — قبل «استلام ولا توصيل». التاريخ
 * والساعة خانتين جنب بعض («دي لوحدها ودي لوحدها»)، وبيتحفظوا مع بعض ميعاد واحد.
 * خانة واحدة للاتنين كانت بتتقص في نص عرض الموبايل.
 *
 * رسالة العميل ٦ أكتوبر (التانية): التاريخ مكتوب باليوم — «الثلاثاء 6 أكتوبر» بدل
 * 2026/10/06 — وواخد تلتين الصف والساعة تلت. خانة التاريخ نفسها مبتغيّرش شكل
 * كتابتها، فالنص قاعد فوقها والكتابة بتاعتها شفافة، والدوسة لسه بتفتح الكاليندر.
 * أيقونة الكاليندر بتاعتنا في آخر الخانة — بتاعة المتصفح كانت بتقع على النص في
 * الكمبيوتر. والساعة مبتقلّش عن 7.75rem: تلت عرض موبايل ٣٦٠ كان بيقص «م».
 *
 * notched: جوه كارت أبيض (رأس «مبيعات») — الاسم على الإطار زي باقي الخانات.
 * من غيره (صفحة المتجر على خلفية الصفحة): الاسم فوق الخانات — جنبها كان مسيبش
 * للتاريخ مكان اليوم («تحت ميعاد التسليم» زي العميل ما اقترح).
 */
export function DeliveryFields({ value, onChange, notched = false }: { value: Delivery; onChange: (next: Delivery) => void; notched?: boolean }) {
  const local = toLocalInput(value.deliveryAt);
  const [day, time] = local ? local.split('T') : ['', ''];
  /** يوم من غير ساعة بياخد ساعة دلوقتي، وساعة من غير يوم بتاخد النهارده */
  const set = (nextDay: string, nextTime: string) => {
    const now = toLocalInput(new Date().toISOString()).split('T');
    onChange({ ...value, deliveryAt: nextDay ? fromLocalInput(`${nextDay}T${nextTime || now[1]}`) : null });
  };

  const dayInput = (
    <input
      type="date"
      aria-label="تاريخ التسليم"
      className={`${compactFieldClass} min-w-0 tabular-nums text-transparent caret-transparent [&::-webkit-calendar-picker-indicator]:hidden`}
      value={day}
      onChange={(e) => set(e.target.value, time)}
      onClick={openCalendar}
    />
  );
  /** فوق خانة التاريخ — الدوسة بتعدّي منه للخانة */
  const dayText = (
    <span aria-hidden data-day-label className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 pe-2.5 ps-2 text-sm tabular-nums">
      <span className={`min-w-0 truncate ${day ? '' : 'text-gray-400'}`}>{day ? dayFieldLabel(day) : 'اختار اليوم'}</span>
      <CalendarIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
    </span>
  );
  const timeInput = (
    <input
      type="time"
      aria-label="ساعة التسليم"
      className={`${compactFieldClass} min-w-0 tabular-nums`}
      value={time}
      onChange={(e) => set(day || toLocalInput(new Date().toISOString()).split('T')[0], e.target.value)}
    />
  );
  const notes = (
    <input
      aria-label="ملاحظات التسليم"
      className={compactFieldClass}
      value={value.deliveryNotes}
      onChange={(e) => onChange({ ...value, deliveryNotes: e.target.value })}
      placeholder={notched ? 'مثال: ابعت عمال ينزّلوا' : 'ملاحظات التسليم (اختياري)'}
      maxLength={300}
    />
  );

  if (notched) {
    return (
      <div className="space-y-4" data-delivery>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(7.75rem,1fr)] gap-2.5">
          <label className="relative block min-w-0">
            {dayInput}
            <Notch compact>ميعاد التسليم</Notch>
            {dayText}
          </label>
          <label className="relative block min-w-0">
            {timeInput}
            <Notch compact>الساعة</Notch>
          </label>
        </div>
        <label className="relative block">
          {notes}
          <Notch compact>ملاحظات التسليم</Notch>
        </label>
      </div>
    );
  }
  return (
    <div className="space-y-2" data-delivery>
      <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">ميعاد التسليم</span>
      <span className="grid grid-cols-[minmax(0,2fr)_minmax(7.75rem,1fr)] gap-2">
        <span className="relative min-w-0 rounded-xl bg-white dark:bg-surface-card">
          {dayInput}
          {dayText}
        </span>
        <span className="min-w-0 rounded-xl bg-white dark:bg-surface-card">{timeInput}</span>
      </span>
      <span className="block rounded-xl bg-white dark:bg-surface-card">{notes}</span>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/**
 * بالماوس الدوسة على النص بتختار جزء من التاريخ (يوم/شهر/سنة) مش بتفتح الكاليندر —
 * والنص ده شفاف. اللمس بيفتحه لوحده.
 */
function openCalendar(e: MouseEvent<HTMLInputElement>) {
  if ((e.nativeEvent as PointerEvent).pointerType !== 'mouse') return;
  try {
    e.currentTarget.showPicker();
  } catch {
    // متصفح قديم — الكيبورد لسه بيكتب التاريخ
  }
}
