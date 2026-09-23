import { useEffect, useRef, useState, type ReactNode } from 'react';

/** قد إيه لازم الصباع يفضل على العلامة عشان الشرح يفتح */
const HOLD_MS = 450;

interface Props {
  /** اسم العلامة لقارئ الشاشة */
  label: string;
  children: ReactNode;
}

/**
 * علامة استفهام بتفتح شرح بالضغطة المطولة، بطلب العميل — بدل سطور شرح ثابتة
 * تحت العنوان. الدوسة العادية مبتعملش حاجة، وأي دوسة برّه بتقفل الشرح.
 * من الكيبورد Enter أو Space بيفتحوه ويقفلوه.
 */
export function HelpHint({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancel = () => window.clearTimeout(timer.current);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onPointerDown={() => {
          cancel();
          timer.current = window.setTimeout(() => setOpen(true), HOLD_MS);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        // الضغطة المطولة على الموبايل بتفتح منيو النسخ — مش عايزينه هنا
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-5 w-5 select-none items-center justify-center rounded-full border border-stone-300 text-[11px] font-bold text-stone-500 [-webkit-touch-callout:none] dark:border-white/20 dark:text-stone-400"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute start-0 top-full z-20 mt-2 block w-72 max-w-[80vw] rounded-xl border border-stone-200 bg-white p-3 text-xs font-normal leading-relaxed text-stone-600 shadow-card dark:border-white/10 dark:bg-surface-card dark:text-stone-300"
        >
          {children}
        </span>
      )}
    </span>
  );
}
