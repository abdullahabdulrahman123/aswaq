import type { ReactNode } from 'react';
import { useDropdown } from '../lib/useDropdown';

/**
 * زرار التلات نقط ⋮ (مكالمة العميل ٩ أكتوبر: «دي ثقافة الموبايل») — اللي مش بيتستعمل كتير بيتلم جوّاه
 * والزرار اللي بيتداس طول الوقت يفضل باين. الدوسة على أي اختيار بتقفل القايمة. dot = حاجة شغالة جوّه
 * (فلتر مثلاً) عشان تبان والقايمة مقفولة.
 */
export function MoreMenu({ label, dot = false, children }: { label: string; dot?: boolean; children: ReactNode }) {
  const { open, setOpen, wrapRef, close } = useDropdown();
  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-more={dot ? 'active' : ''}
        onClick={() => setOpen((v) => !v)}
        className={`relative grid h-9 w-9 place-items-center rounded-xl border transition ${
          open
            ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 dark:border-white/15 dark:bg-transparent dark:text-gray-300'
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
        {dot && <span aria-hidden="true" className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600 dark:border-surface-card" />}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[role^="menuitem"]')) close();
          }}
          className="absolute end-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** سطر في قايمة ⋮ — danger للإلغاء (آخر القايمة)، checked للفلتر */
export const menuItemClass = (danger = false) =>
  `flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm font-semibold transition disabled:opacity-40 aria-disabled:opacity-40 ${
    danger ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
  }`;
