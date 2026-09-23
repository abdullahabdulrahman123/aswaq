import type { Premises } from '../context/AuthContext';
import { oneLine } from '../lib/address';
import { formatDistance } from '../lib/buyerLocation';
import { PinIcon } from './PinIcon';

/** نوع المقر كشارات — والمقر اللي مش متجر ولا مخزن ملوش شارة */
function KindBadges({ premises }: { premises: Premises }) {
  const kinds = [premises.isWarehouse && 'مخزن', premises.isStore && 'متجر'].filter((k): k is string => Boolean(k));
  return (
    <>
      {kinds.map((kind) => (
        <span
          key={kind}
          className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300"
        >
          {kind}
        </span>
      ))}
    </>
  );
}

/**
 * مقر واحد في ليستة مقرات النشاط: اسمه ونوعه، وتحته ملخص قصير لعنوانه (بطلب
 * العميل). سطر واحد مقصوص عشان النشاط ممكن يكون له عشر فروع. الدوسة بتفتح
 * المقر في فورمه للتعديل.
 */
export function PremisesCard({
  premises,
  deliveryRadiusKm,
  onOpen,
}: {
  premises: Premises;
  /** نطاق توصيل المتجر من أسواق — بيظهر تحت العنوان */
  deliveryRadiusKm?: number | null;
  onOpen: () => void;
}) {
  const summary = (premises.address && oneLine(premises.address)) || 'من غير عنوان';

  return (
    <li className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-stone-50 dark:hover:bg-white/5"
      >
        {/* min-w-0 شرط عشان truncate تشتغل جوه flex */}
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-display text-sm font-bold">{premises.name}</span>
            <KindBadges premises={premises} />
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span className="truncate">{summary}</span>
          </span>
          {/* سطر لوحده مش شارة جنب الاسم: الشارة كانت بتقص اسم المتجر على الموبايل */}
          {premises.isStore && deliveryRadiusKm != null && (
            <span className="mt-0.5 block text-xs font-medium text-accent-700 dark:text-accent-300">
              بيوصّل لحد {formatDistance(deliveryRadiusKm)}
            </span>
          )}
        </span>
        {/* RTL: «افتح» بيشاور على الشمال */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-stone-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
    </li>
  );
}
