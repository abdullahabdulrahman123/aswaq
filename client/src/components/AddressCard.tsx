import { useState } from 'react';
import type { BusinessAddress } from '../context/AuthContext';

/** العنوان كسطر واحد — نفس ترتيب ما بيتكتب على أي ظرف */
export function oneLine(a: BusinessAddress): string {
  return [a.street, a.district, a.city, a.governorate, a.country].filter(Boolean).join('، ');
}

interface Props {
  address: BusinessAddress;
  onEdit: () => void;
  /** بيخلص لما وصلة ترد. الأخطاء بتتعرض في الصفحة، فمبيرميش */
  onDelete: () => Promise<void>;
}

const hasKind = (a: BusinessAddress) => a.isStore || a.isWarehouse;

/** نوع العنوان كشارات — القديم اللي اتسجّل قبل ما النوع يتضاف بيبان إنه ناقص */
function KindBadges({ address }: { address: BusinessAddress }) {
  if (!hasKind(address)) {
    return (
      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        من غير نوع
      </span>
    );
  }
  const kinds = [address.isWarehouse && 'مخزن', address.isStore && 'متجر'].filter((k): k is string => Boolean(k));
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

/** صف تفصيلة واحدة جوه العنوان المفتوح */
function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-stone-400">{label}</span>
      <span className="min-w-0 flex-1 break-words">{value}</span>
    </div>
  );
}

/**
 * عنوان واحد في قايمة عناوين النشاط.
 *
 * مقفول: سطر واحد مقصوص. النشاط ممكن يكون له عشر فروع، ولو كل واحد فيهم
 * فارد كل تفاصيله القايمة تبقى صفحة طويلة مش بتتقرا. الضغط بيفتح العنوان
 * كامل، وساعتها بس بتبان أزرار التعديل والحذف.
 */
export function AddressCard({ address, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const summary = oneLine(address) || 'عنوان من غير تفاصيل';

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      // لو الحذف نجح الكارت بيختفي من القايمة، ولو فشل يرجع زي ما كان
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-stone-50 dark:hover:bg-white/5"
      >
        {/* min-w-0 شرط عشان truncate تشتغل جوه flex */}
        <span className="min-w-0 flex-1">
          {/* النوع دايماً في أول سطر، والاسم قبله لو فيه */}
          <span className="flex min-w-0 items-center gap-1.5">
            {address.label && (
              <span className="truncate font-display text-sm font-bold">{address.label}</span>
            )}
            <KindBadges address={address} />
          </span>
          <span className="mt-0.5 block truncate text-sm text-stone-500 dark:text-stone-400">{summary}</span>
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-stone-200 px-4 py-3 text-sm dark:border-white/10">
          <div className="grid gap-1.5">
            <Row label="الدولة" value={address.country} />
            <Row label="المحافظة" value={address.governorate} />
            <Row label="المدينة" value={address.city} />
            <Row label="الحي" value={address.district} />
            <Row label="الشارع" value={address.street} />
            <Row label="علامة مميزة" value={address.landmark} />
            <Row label="الوصف" value={address.description} />
          </div>

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 border-t border-stone-100 pt-2.5 text-xs text-stone-400 dark:border-white/5">
            <span>
              خط العرض{' '}
              <span dir="ltr" className="font-mono tabular-nums">{address.lat.toFixed(6)}</span>
            </span>
            <span>
              خط الطول{' '}
              <span dir="ltr" className="font-mono tabular-nums">{address.lng.toFixed(6)}</span>
            </span>
          </p>

          {!hasKind(address) && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              العنوان ده اتسجّل قبل ما نضيف النوع — دوس «تعديل» واختار مخزن أو متجر.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              disabled={deleting}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60 dark:border-white/15 dark:hover:text-brand-400"
            >
              تعديل
            </button>

            {/* تأكيد في المكان بدل نافذة المتصفح — الحذف مالوش رجعة */}
            {confirming ? (
              <>
                <span className="text-xs text-stone-500 dark:text-stone-400">متأكد؟</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-progress disabled:opacity-70"
                >
                  {deleting ? 'بنحذف…' : 'احذف'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="rounded-lg px-2 py-1.5 text-xs text-stone-500 transition hover:text-stone-700 disabled:opacity-60 dark:text-stone-400"
                >
                  رجوع
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
              >
                حذف
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
