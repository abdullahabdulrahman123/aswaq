import { egp } from '../lib/money';
import type { OrderRow } from '../lib/orderRows';
import { serialTag, stageLabel } from '../lib/orderFlow';
import { itemsLabel } from '../lib/quantity';
import { stageColor } from '../lib/stageColors';
import { StateBox } from './StateBox';

/**
 * صف أوردر في «طلباتي» أو في بيعات «الطلبات الواردة» اللي لسه متأكدتش: الشركة
 * (أو مشتري البيعة) والمتجر، ومسودة ولا فاتورة برقمها، والإجمالي — واسم اللي
 * عمل المسودة لو زميل في الشركة.
 *
 * مكالمة العميل ٩ أكتوبر: بنفس شكل صف الطلب في «مهامي» — مربع الحالة برقمها قبل الاسم، واللون
 * بس هو اللي بيفرق؛ والمرحلة في السطر اللي تحته بلونها.
 */
export function OrderRowButton({ row, onOpen, title }: { row: OrderRow; onOpen: () => void; title: string }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <StateBox order={row.order} />
            <span className="truncate font-display font-bold">{title}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
            {row.order && row.order.state !== 'draft' && <span className={`font-semibold ${stageColor(row.order).text}`}>{stageLabel(row.order)} · </span>}
            {row.order && serialTag(row.order) && <span className="tabular-nums" data-serial>{serialTag(row.order)} · </span>}
            {row.store}
            {row.buyer && row.buyer !== title && <> · بيع لـ{row.buyer}</>}
            {/* مسودة زميل في الشركة (مكالمة ٨ أكتوبر) */}
            {row.by && <span data-created-by> · عملها {row.by}</span>}
          </span>
        </span>
        <span className="shrink-0 text-end">
          <span className="block text-sm font-bold tabular-nums">{egp(row.total)}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{itemsLabel(row.count)}</span>
        </span>
      </button>
    </li>
  );
}
