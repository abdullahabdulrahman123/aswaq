import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** اسم العلامة لقارئ الشاشة */
  label: string;
  children: ReactNode;
}

/**
 * علامة استفهام بتفتح شرح بدوسة عادية على العلامة نفسها بس، بطلب العميل —
 * بدل سطور شرح ثابتة تحت العنوان. الدوسة تاني أو أي دوسة برّه بتقفله.
 * النصوص دي هتبقى في الآخر مقتبسة من دليل استخدام كامل.
 *
 * الشرح بيتعلّق في أقرب أب relative (سطر العنوان مثلاً) مش في العلامة نفسها:
 * العلامة قريبة من الطرف، وشرح متعلّق فيها كان بيطلع برّه الشاشة على موبايل ٣٦٠.
 */
export function HelpHint({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <span ref={rootRef} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 select-none items-center justify-center rounded-full border border-stone-300 text-[11px] font-bold text-stone-500 dark:border-white/20 dark:text-stone-400"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute start-0 top-full z-20 mt-2 block w-full max-w-sm rounded-xl border border-stone-200 bg-white p-3 text-xs font-normal leading-relaxed text-stone-600 shadow-card dark:border-white/10 dark:bg-surface-card dark:text-stone-300"
        >
          {children}
        </span>
      )}
    </span>
  );
}
