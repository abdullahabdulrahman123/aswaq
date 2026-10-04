import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchItem, putItem, type Item } from '../lib/aswaqApi';
import { PRICE_FIELDS, PRICE_GROUPS, PRICE_LABELS, type PriceField } from '../lib/itemUnits';
import { moneyInput, toPiastres, toPounds } from '../lib/quantity';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { DialogCloseButton, useBackdropClose } from './DialogClose';

type Texts = Record<string, Record<PriceField, string>>;

const textsOf = (item: Item): Texts =>
  Object.fromEntries(item.units.map((u) => [u.name, Object.fromEntries(PRICE_FIELDS.map((f) => [f, u[f] === null ? '' : toPounds(u[f]!)])) as Record<PriceField, string>]));

/**
 * «التسعير» بطلب العميل (٣٠ سبتمبر): الدوسة على اسم الصنف بتفتحها. فوق اسم
 * الصنف وجنبه «حفظ»، وتحته صف لكل وحدة — اسمها والأربع أسعار. نافذة واحدة
 * بتتحط في أي صفحة («إدارة أصناف المتاجر» الأول، والفواتير بعدين).
 *
 * بتحفظ الصنف اللي اتبعتلها بـ`PUT /items/:id`. نسخة المتجر بيتحفظ منها
 * الأسعار بس (السيرفر بياخد الباقي من الأصل)، فالأسعار دي بتاعت المتجر ده.
 * الخانة الفاضية = الوحدة مبتتباعش بالسعر ده.
 *
 * ده سعر المتجر لكل العملاء — غير خانة «السعر» في نافذة الكمية في «مبيعات»
 * (سعر للعميل ده في الفاتورة دي بس). note بيقول للبائع الفاتورة اللي هو فيها
 * هتتأثر ولا لأ.
 */
export function PriceDialog({ item, note, onSaved, onClose }: { item: Item; note?: string; onSaved: (item: Item) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const [texts, setTexts] = useState<Texts>(() => textsOf(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  const set = (unit: string, field: PriceField, text: string) => setTexts((prev) => ({ ...prev, [unit]: { ...prev[unit], [field]: moneyInput(text) } }));

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError('');
    const units = item.units.map((u) => ({
      ...u,
      ...Object.fromEntries(PRICE_FIELDS.map((f) => [f, toPiastres(texts[u.name][f])])),
    }));
    try {
      const saved = await withToken((token) =>
        putItem(token, item.accountId, item.id, { name: item.name, picture: item.picture, rate: item.rate, isOwner: item.isOwner, units }),
      );
      onSaved(saved);
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ الأسعار. جرّب تاني.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label={`تسعير ${item.name}`}
      // العرض في style مش كلاس — نفس سبب باقي النوافذ
      style={{ width: 'min(30rem, 94vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 pe-8">
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{item.name}</h2>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
          >
            {saving ? 'بنحفظ…' : 'حفظ'}
          </button>
        </div>

        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">سعر المتجر لكل العملاء.</p>
        {note && (
          <p role="note" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {note}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {/* عمود الوحدة وأربع أسعار — عنوان المجموعة (جملة / قطاعي) فوق المحل والأونلاين، زي فورم الصنف (٢ أكتوبر) */}
        <table className="mt-4 w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1.5 text-center">
          <colgroup>
            <col className="w-[22%]" />
          </colgroup>
          <thead className="text-[11px] leading-tight text-stone-500 dark:text-stone-400">
            <tr>
              <th rowSpan={2} className="text-start align-bottom font-medium">
                الوحدة
              </th>
              {PRICE_GROUPS.map((group) => (
                <th key={group.label} colSpan={2} className="border-b border-stone-200 pb-1 font-semibold text-stone-600 dark:border-white/10 dark:text-stone-300">
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {PRICE_GROUPS.flatMap((group) => group.fields).map(({ field, label }) => (
                <th key={field} className="font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.units.map((u) => (
              <tr key={u.name}>
                <th scope="row" className="truncate text-start text-sm font-semibold" title={u.name}>
                  {u.name}
                </th>
                {PRICE_GROUPS.flatMap((group) => group.fields).map(({ field }) => (
                  <td key={field}>
                    <input
                      aria-label={`${u.name} — ${PRICE_LABELS[field]}`}
                      inputMode="decimal"
                      value={texts[u.name][field]}
                      onChange={(e) => set(u.name, field, e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none transition focus:border-brand-500 dark:border-white/20"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-400">بالجنيه. الخانة الفاضية = الوحدة مبتتباعش بالسعر ده.</p>
      </div>
      <DialogCloseButton />
    </dialog>
  );
}

/**
 * «التسعير» من الفاتورة: الصنف بييجي من السيرفر بالـid اللي في سطر الفاتورة
 * (نسخة المتجر). لحد ما يوصل مفيش نافذة.
 */
export function PriceDialogFor({
  accountId,
  itemId,
  note,
  onSaved,
  onClose,
}: {
  accountId: string;
  itemId: string;
  note?: string;
  onSaved: (item: Item) => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    withToken((token) => fetchItem(token, accountId, itemId))
      .then((found) => {
        if (!cancelled) setItem(found);
      })
      .catch(() => {
        if (!cancelled) closeRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, itemId, withToken]);

  return item ? <PriceDialog item={item} note={note} onSaved={onSaved} onClose={onClose} /> : null;
}
