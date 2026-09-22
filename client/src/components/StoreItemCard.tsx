import { useState } from 'react';
import { egp } from '../data/catalog';
import { useStoreCart, type CartLine } from '../context/StoreCartContext';
import type { ShowroomItem } from '../lib/aswaqApi';
import { thumbnail } from '../lib/cloudinary';
import type { PriceField } from '../lib/itemUnits';
import { MAX_QTY, clampQty, moneyInput, qtyInput, toPiastres, toPounds } from '../lib/quantity';
import { Notch } from './OutlinedField';
import { QuantityDialog } from './QuantityDialog';

/**
 * كارت الصنف في صفحة المتجر، بالشكل اللي العميل طلبه في مكالمة ٢٢ سبتمبر:
 *
 *   الصورة والاسم، وتحتهم كومبو فيه وحدات الصنف وسعر كل وحدة جنب اسمها،
 *   وجنب الكومبو زرار (+) بس — لسه مفيش كمية. الدوسة على (+) بتفتح نافذة
 *   صغيرة للكمية، وبعد «تم» بينزل سطر تحت الكومبو فيه الكمية والإجمالي
 *   وزرارين (+) و(−)، والوحدة اللي اتاخدت بتخرج من الكومبو — زي تنزيل
 *   المشتريات بالظبط.
 *
 * السطر: السعر مكتوب على إطار خانة الكمية، واسم الوحدة على إطار خانة
 * الإجمالي. الإجمالي بيتكتب زي الكمية: لو كتبت ١٠٠٠ والوحدة بـ٤٥، الكمية
 * بتبقى ٢٢ والإجمالي بيرجع ٩٩٠ — أقرب كمية صحيحة من تحت.
 *
 * أنهي سعر من الأربعة (priceField) بتحدده الصفحة: نوع الحساب وطريقة الاستلام.
 */
export function StoreItemCard({
  item,
  priceField,
  shopId,
  storeName,
}: {
  item: ShowroomItem;
  priceField: PriceField;
  shopId: string;
  storeName: string;
}) {
  const { linesOf, putLine, setQty, removeLine } = useStoreCart();
  const [pickedUnit, setPickedUnit] = useState('');
  const [asking, setAsking] = useState(false);

  const mine = new Map(linesOf(shopId).filter((l) => l.itemId === item.id).map((l) => [l.unitName, l]));
  // بترتيب وحدات الصنف نفسه، مش بترتيب الإضافة
  const rows = item.units.map((u) => mine.get(u.name)).filter((l): l is CartLine => Boolean(l));
  const available = item.units.filter((u) => !mine.has(u.name));

  const unit = available.find((u) => u.name === pickedUnit) ?? available[0];
  const price = unit ? (unit[priceField] ?? null) : null;

  return (
    <li className="flex overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-white/10 dark:bg-surface-card">
      <div className="relative w-28 shrink-0 self-stretch bg-stone-100 dark:bg-white/5">
        {item.picture ? (
          <img src={thumbnail(item.picture, 240)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center font-display text-3xl font-bold text-stone-300 dark:text-stone-600"
          >
            {item.name.trim().charAt(0)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
        <h3 className="break-words font-display text-sm font-bold leading-snug">{item.name}</h3>

        {/* الكومبو وزرار (+) بس — الكمية بتتحدد في النافذة */}
        <div className="flex items-center gap-2">
          <select
            aria-label={`وحدة ${item.name}`}
            value={unit?.name ?? ''}
            disabled={available.length === 0}
            onChange={(e) => setPickedUnit(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-transparent px-1.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 disabled:text-stone-400 dark:border-white/20 dark:disabled:text-stone-500"
          >
            {available.length === 0 ? (
              <option value="">مفيش وحدات تانية</option>
            ) : (
              available.map((u) => {
                const p = u[priceField] ?? null;
                return (
                  <option key={u.name} value={u.name}>
                    {u.name} {p === null ? '— السعر لسه متحددش' : egp(p)}
                  </option>
                );
              })
            )}
          </select>
          <button
            type="button"
            aria-label={`ضيف ${item.name}`}
            onClick={() => setAsking(true)}
            disabled={price === null}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-300 bg-brand-50 text-lg font-bold leading-none text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-transparent disabled:text-stone-300 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300 dark:disabled:border-white/10 dark:disabled:text-stone-600"
          >
            +
          </button>
        </div>

        {rows.length > 0 && (
          <ul aria-label={`المطلوب من ${item.name}`} className="mt-1 flex flex-col gap-3.5">
            {rows.map((line) => (
              <LineRow
                key={line.unitName}
                line={line}
                onQty={(qty) => setQty(line, qty)}
                onRemove={() => removeLine(line)}
              />
            ))}
          </ul>
        )}
      </div>

      {unit && price !== null && (
        <QuantityDialog
          open={asking}
          itemName={item.name}
          unitName={unit.name}
          unitPrice={price}
          onDone={(qty) => {
            putLine({ shopId, storeName, itemId: item.id, itemName: item.name, unitName: unit.name, qty, unitPrice: price });
            setAsking(false);
            setPickedUnit('');
          }}
          onClose={() => setAsking(false)}
        />
      )}
    </li>
  );
}

/**
 * سطر وحدة اتطلبت: الكمية والإجمالي، والسعر واسم الوحدة على إطاريهم. (−) وهي
 * واحد بتشيل السطر وترجّع الوحدة للكومبو، بطلب المستخدم.
 */
function LineRow({ line, onQty, onRemove }: { line: CartLine; onQty: (qty: number) => void; onRemove: () => void }) {
  /** null = مش بيكتب دلوقتي، فالخانة بتعرض القيمة المحفوظة */
  const [qtyText, setQtyText] = useState<string | null>(null);
  const [totalText, setTotalText] = useState<string | null>(null);

  const priced = line.unitPrice !== null;
  const total = priced ? line.unitPrice! * line.qty : null;

  /** الخانة بتتعلّم كلها أول ما تتفتح — اللي يتكتب يحل محلها */
  const selectAll = (el: HTMLInputElement | null) => el?.setSelectionRange(0, el.value.length);

  function commitQty() {
    const typed = qtyText;
    setQtyText(null);
    if (typed === null) return;
    const n = Number(typed) || 0;
    if (n <= 0) onRemove();
    else if (n !== line.qty) onQty(clampQty(n));
  }

  function commitTotal() {
    const typed = totalText;
    setTotalText(null);
    if (typed === null || !priced) return;
    const piastres = toPiastres(typed);
    if (piastres === null) return;
    const qty = Math.floor(piastres / line.unitPrice!);
    if (qty <= 0) onRemove();
    else if (qty !== line.qty) onQty(Math.min(MAX_QTY, qty));
  }

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`زوّد ${line.unitName}`}
        onClick={() => onQty(clampQty(line.qty + 1))}
        disabled={line.qty >= MAX_QTY}
        className={stepClass}
      >
        +
      </button>

      <label className="relative block w-11 shrink-0">
        <input
          aria-label={`كمية ${line.unitName}`}
          inputMode="numeric"
          value={qtyText ?? String(line.qty)}
          onChange={(e) => setQtyText(qtyInput(e.target.value))}
          onFocus={(e) => selectAll(e.currentTarget)}
          onClick={(e) => selectAll(e.currentTarget)}
          onBlur={commitQty}
          className={boxClass}
        />
        <Notch compact>{priced ? egp(line.unitPrice!).replace(' ج.م', '') : '—'}</Notch>
      </label>

      <label className="relative block min-w-0 flex-1">
        <input
          aria-label={`إجمالي ${line.unitName}`}
          inputMode="decimal"
          disabled={!priced}
          value={totalText ?? (priced ? egp(total!) : 'السعر لسه متحددش')}
          onChange={(e) => setTotalText(moneyInput(e.target.value))}
          onFocus={(e) => {
            if (!priced) return;
            const el = e.currentTarget;
            setTotalText(toPounds(total!));
            // القيمة بتتغيّر بعد الرسمة — بنعلّمها بعدها
            requestAnimationFrame(() => selectAll(el));
          }}
          onClick={(e) => selectAll(e.currentTarget)}
          onBlur={commitTotal}
          className={boxClass}
        />
        <Notch compact>{line.unitName}</Notch>
      </label>

      <button
        type="button"
        aria-label={line.qty <= 1 ? `شيل ${line.unitName}` : `قلّل ${line.unitName}`}
        onClick={() => (line.qty <= 1 ? onRemove() : onQty(line.qty - 1))}
        className={stepClass}
      >
        −
      </button>
    </li>
  );
}

const stepClass =
  'grid h-8 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-base font-bold leading-none text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-300 dark:disabled:text-stone-600';

const boxClass =
  'w-full rounded-lg border border-stone-300 bg-transparent px-1 py-1.5 text-center text-[11px] font-bold tabular-nums outline-none transition focus:border-brand-500 disabled:border-stone-200 disabled:font-medium disabled:text-stone-400 dark:border-white/20 dark:disabled:border-white/10 dark:disabled:text-stone-500';
