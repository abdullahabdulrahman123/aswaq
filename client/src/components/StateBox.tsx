import type { Order } from '../lib/aswaqApi';
import { stateNumberOf } from '../lib/orderFlow';
import { stageColor } from '../lib/stageColors';

/**
 * مربع الحالة برقمها قبل اسم العميل — «مسودة 69» / «طلب 42» / «فاتورة 25» بلون المرحلة (رسالة العميل ٦
 * أكتوبر). مكالمة العميل ٩ أكتوبر: المسودة بنفس شكل الطلب، «اديهم شكل واحد بس اختلاف في اللون».
 * order = null: سلة على الجهاز لسه ملهاش رقم
 */
export function StateBox({ order }: { order: Order | null }) {
  const state = order ? stateNumberOf(order) : { label: 'مسودة', number: null };
  const color = stageColor(order ?? { state: 'draft' });
  return (
    <span data-state-number className={`shrink-0 rounded-md px-1.5 py-0.5 font-display text-sm font-bold leading-snug tabular-nums ${color.box}`}>
      <span className="text-[11px] font-semibold">{state.label}</span>
      {state.number != null && ` ${state.number}`}
    </span>
  );
}
