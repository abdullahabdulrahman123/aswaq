import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { backOrder, type Order } from '../lib/aswaqApi';
import { stageLabel, stateNumber } from '../lib/orderFlow';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { DialogCloseButton, useBackdropClose } from './DialogClose';

/**
 * «تراجع» (مكالمة العميل ٩ أكتوبر): «يفتحلي دايلوج صغير إن أنا أرجعه لحالة سابقة في الستيج اللي هو فيها» —
 * مثلاً الميزان طلّع غلط في العدد فالطلب يرجع للمراجعة. المراحل من السيرفر (backTo): جوه مراحل الطلب بس،
 * والأقرب متعلّم من الأول.
 */
export function BackOrderDialog({ order, onMoved, onClose }: { order: Order; onMoved: (order: Order) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const stages = order.backTo ?? [];
  const [to, setTo] = useState(stages[stages.length - 1]?.state ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !to) return;
    setSaving(true);
    setError('');
    try {
      onMoved(await withToken((token) => backOrder(token, order.id, to)));
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 409
          ? 'الطلب اتنقل من جهاز تاني في نفس اللحظة. افتحه تاني وشوف هو فين.'
          : status === 422
            ? 'الطلب مبقاش ينفع يرجع للمرحلة دي — يمكن بقى فاتورة. افتحه تاني.'
            : 'مقدرناش نرجّع الطلب. جرّب تاني.',
      );
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label="تراجع"
      style={{ width: 'min(26rem, 94vw)' }}
      className="rounded-2xl bg-white p-0 text-gray-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-gray-100"
    >
      <form onSubmit={handleSubmit} className="p-5">
        <h2 className="pe-8 font-display text-lg font-bold">تراجع</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {stateNumber(order, true)} دلوقتي «{stageLabel(order)}». ترجّعه لأنهي مرحلة؟
        </p>

        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">المرحلة اللي الطلب يرجعلها</legend>
          {stages.map((s) => (
            <label
              key={s.state}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                to === s.state ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'border-gray-300 dark:border-white/15'
              }`}
            >
              <input type="radio" name="back-to" value={s.state} checked={to === s.state} onChange={() => setTo(s.state)} className="h-4 w-4 accent-brand-600" />
              {s.label}
            </label>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving || !to}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'لحظة…' : 'رجّعه'}
          </button>
        </div>
      </form>
      <DialogCloseButton />
    </dialog>
  );
}
