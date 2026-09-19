import { useEffect, useRef } from 'react';

/**
 * المستخدم بيغيّر الحساب وهو في نص صنف لسه متحفظش — بنسأله الأول بدل ما يضيع
 * اللي كتبه، بطلب العميل. الرد الآمن («كمّل الصنف») هو اللي عليه التركيز.
 */
export function UnsavedSwitchDialog({
  accountName,
  onConfirm,
  onCancel,
}: {
  /** الحساب اللي هيتحوّل له */
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    stayRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-switch-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-surface-card">
        <h2 id="unsaved-switch-title" className="font-display text-lg font-bold">
          الصنف اللي بتكتبه مش هيتحفظ
        </h2>

        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">
          لو غيّرت الحساب لـ«{accountName}» دلوقتي، اللي كتبته هيضيع. تكمل؟
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            ref={stayRef}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold transition hover:border-stone-400 dark:border-white/15"
          >
            لأ، كمّل الصنف
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            أيوه، غيّر الحساب
          </button>
        </div>
      </div>
    </div>
  );
}
