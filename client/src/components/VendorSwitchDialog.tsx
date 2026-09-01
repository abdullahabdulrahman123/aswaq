import { useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { vendorById } from '../data/catalog';

/**
 * الطلب الواحد من شركة واحدة. لما الزبون يحاول يضيف من شركة تانية
 * بنوقف الإضافة ونسأله بدل ما نفضّي سلته من غير ما ياخد باله.
 */
export function VendorSwitchDialog() {
  const { pendingAdd, confirmSwitchVendor, cancelSwitchVendor } = useCart();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pendingAdd) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelSwitchVendor();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pendingAdd, cancelSwitchVendor]);

  if (!pendingAdd) return null;

  const current = vendorById(pendingAdd.currentVendorId);
  const next = vendorById(pendingAdd.nextVendorId);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) cancelSwitchVendor();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-surface-card">
        <h2 id="switch-title" className="font-display text-lg font-bold">
          سلتك من شركة تانية
        </h2>

        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">
          الطلب الواحد على أسواق بيكون من شركة واحدة بس، عشان الشحن والإرجاع يفضلوا واضحين.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-stone-50 p-4 text-sm dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500 dark:text-stone-400">سلتك دلوقتي من</span>
            <span className="font-semibold">{current?.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500 dark:text-stone-400">وبتحاول تضيف من</span>
            <span className="font-semibold text-brand-700 dark:text-brand-400">{next?.name}</span>
          </div>
        </div>

        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          لو كمّلت، السلة الحالية هتتفضي وهنبدأ من {next?.name}.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={cancelSwitchVendor}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold transition hover:border-stone-400 dark:border-white/15"
          >
            سيب سلتي زي ما هي
          </button>
          <button
            ref={confirmRef}
            onClick={confirmSwitchVendor}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            فضّي وابدأ من {next?.name}
          </button>
        </div>
      </div>
    </div>
  );
}
