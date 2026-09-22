import { useState } from 'react';
import { useBuyerLocation } from '../context/LocationContext';
import { LocationDialog } from './LocationDialog';
import { PinIcon } from './PinIcon';

/**
 * شريط «مكانك» فوق الرئيسية وصفحة المتجر: المكان اللي المعرض بيحسب منه
 * المسافة والتوصيل، والدوسة عليه بتغيّره. prompt هي الجملة اللي بتظهر لما
 * المكان مش متحدد — كل صفحة بتقول هتعمل بيه إيه.
 */
export function LocationBar({ prompt = 'حدد مكانك عشان نرتّبلك المتاجر من الأقرب' }: { prompt?: string }) {
  const { location } = useBuyerLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-start text-sm transition ${
          location
            ? 'border-stone-200 bg-white hover:border-brand-400 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-400'
            : 'border-dashed border-brand-400 bg-brand-50/70 hover:bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
        }`}
      >
        <PinIcon className="h-[18px] w-[18px] shrink-0 text-brand-600 dark:text-brand-400" />
        {/* min-w-0 شرط عشان truncate تشتغل جوه flex */}
        <span className="min-w-0 flex-1">
          {location ? (
            <span className="block truncate">
              <span className="text-stone-500 dark:text-stone-400">مكانك: </span>
              <span className="font-medium">{location.label}</span>
            </span>
          ) : (
            <span className="block text-brand-800 dark:text-brand-200">{prompt}</span>
          )}
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand-700 dark:text-brand-400">{location ? 'غيّر' : 'حدد'}</span>
      </button>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
