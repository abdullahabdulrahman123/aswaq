import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { cancelOrder, type Order } from '../lib/aswaqApi';
import { deniedMessage, PERMISSIONS } from '../lib/permissions';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { DialogCloseButton, useBackdropClose } from './DialogClose';

/**
 * إلغاء الفاتورة (مكالمة ٥ أكتوبر): «كانسل للفاتورة مع السبب، ومين اللي كانسل
 * سيلر أو بايير». السبب لازم يتكتب، والسيرفر بيعرف مين اللي لغى من الحساب
 * (البائع ولا المشتري) — server/src/controllers/order.controller.ts (cancel).
 *
 * buyer: المشتري بيلغي طلبه هو — الكلام «الطلب» مش «الفاتورة».
 */
export function CancelOrderDialog({ order, buyer = false, onCancelled, onClose }: { order: Order; buyer?: boolean; onCancelled: (order: Order) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const what = buyer ? 'الطلب' : 'الفاتورة';

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      onCancelled(await withToken((token) => cancelOrder(token, order.id, reason.trim())));
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 403
          ? buyer
            ? 'البائع بدأ يجهّز الطلب خلاص — كلّمه عشان يلغيه.'
            : deniedMessage(PERMISSIONS.invoiceCancel)
          : status === 409
            ? `${what} دي اتنقلت أو خلصت في نفس اللحظة. افتحها تاني وشوف هي فين.`
            : `مقدرناش نلغي ${what}. جرّب تاني.`,
      );
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label={`إلغاء ${what}`}
      style={{ width: 'min(26rem, 94vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      <form onSubmit={handleSubmit} className="p-5">
        <h2 className="pe-8 font-display text-lg font-bold">
          إلغاء {what}
          {order.number != null && <span className="tabular-nums"> رقم {order.number}</span>}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{buyer ? 'البائع هيشوف السبب.' : 'المشتري هيشوف إن الفاتورة اتلغت.'}</p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">السبب</span>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            required
            maxLength={300}
            rows={3}
            autoFocus
            placeholder={buyer ? 'مثال: طلبت بالغلط' : 'مثال: العميل رجع في الطلب'}
            className="w-full resize-none rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 dark:border-white/20"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving || !reason.trim()}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'بنلغي…' : `إلغاء ${what}`}
          </button>
        </div>
      </form>
      <DialogCloseButton />
    </dialog>
  );
}

/** «اتلغت من البائع (اسمه): السبب» — على الفاتورة الملغية */
export function CancellationNote({ order }: { order: Order }) {
  const c = order.cancellation;
  if (order.state !== 'cancelled' || !c) return null;
  return (
    <p data-cancellation className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 dark:bg-red-500/10 dark:text-red-300">
      <span className="font-semibold">
        لغاها {c.by === 'seller' ? 'البائع' : 'المشتري'} ({c.person.name}):
      </span>{' '}
      {c.reason}
    </p>
  );
}
