import { fromLocalInput, toLocalInput, type Delivery } from '../lib/delivery';
import { Notch, compactFieldClass } from './OutlinedField';

/**
 * ميعاد التسليم وملاحظاته (رسالة العميل ٦ أكتوبر) — قبل «استلام ولا توصيل». التاريخ
 * والساعة خانتين جنب بعض («دي لوحدها ودي لوحدها»)، وبيتحفظوا مع بعض ميعاد واحد.
 * خانة واحدة للاتنين كانت بتتقص في نص عرض الموبايل.
 *
 * notched: جوه كارت أبيض (رأس «مبيعات») — الاسم على الإطار زي باقي الخانات.
 * من غيره (صفحة المتجر على خلفية الصفحة): الاسم جنب الخانات.
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
      className={`${compactFieldClass} min-w-0 tabular-nums`}
      value={day}
      onChange={(e) => set(e.target.value, time)}
    />
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
        <div className="grid grid-cols-2 gap-2.5">
          <label className="relative block min-w-0">
            {dayInput}
            <Notch compact>ميعاد التسليم</Notch>
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
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">ميعاد التسليم</span>
        <span className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <span className="rounded-xl bg-white dark:bg-surface-card">{dayInput}</span>
          <span className="rounded-xl bg-white dark:bg-surface-card">{timeInput}</span>
        </span>
      </div>
      <span className="block rounded-xl bg-white dark:bg-surface-card">{notes}</span>
    </div>
  );
}
