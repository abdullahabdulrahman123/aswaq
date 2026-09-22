import { useState, type SyntheticEvent } from 'react';
import { egp } from '../data/catalog';
import type { ShowroomItem } from '../lib/aswaqApi';
import { thumbnail } from '../lib/cloudinary';
import type { PriceField } from '../lib/itemUnits';

/** خمس أرقام — أي كمية أكبر من كده غلطة كتابة */
const MAX_QTY = 99_999;

/** الكيبورد العربي بيكتب ٠-٩ — بتتقري زي 0-9 */
const latinDigits = (text: string) => text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const stepClass =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg font-bold leading-none text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent dark:text-brand-300 dark:hover:bg-brand-500/15 dark:disabled:text-stone-600';

/** الدوسة على الكمية بتعلّمها كلها (موبايل ولابتوب)، فالرقم اللي يتكتب بيحل محلها */
const selectAll = (e: SyntheticEvent<HTMLInputElement>) => e.currentTarget.setSelectionRange(0, e.currentTarget.value.length);

/**
 * كارت الصنف في صفحة المتجر، بطلب العميل: صورته واسمه، والوحدة (شكارة، طن…)
 * والسعر بتاعها — السعر بيتغيّر لما الوحدة تتغيّر. وتحت زرار (+) وزرار (−)
 * والكمية بينهم، وينفع تتكتب باليد كمان. الكمية رقم صحيح بس: مفيش كسور.
 *
 * أنهي سعر من الأربعة بيحدده المتجر (priceField): نوع الحساب وطريقة الاستلام.
 * السلة لسه — الكمية مستنياها.
 */
export function StoreItemCard({ item, priceField }: { item: ShowroomItem; priceField: PriceField }) {
  const [unitName, setUnitName] = useState(item.units[0]?.name ?? '');
  /** نص مش رقم: الخانة ممكن تبقى فاضية وهو بيكتب */
  const [qtyText, setQtyText] = useState('1');

  const unit = item.units.find((u) => u.name === unitName) ?? item.units[0];
  const price = unit ? unit[priceField] : null;
  const qty = Number(qtyText) || 0;
  const setQty = (n: number) => setQtyText(String(Math.min(MAX_QTY, Math.max(1, n))));

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-white/10 dark:bg-surface-card">
      {/* 4:3 مش مربعة: الكارت أقصر، بطلب المستخدم. الصورة absolute عشان مقاسها
          الأصلي (مربع) ميكبّرش الإطار بعد ما تحمّل */}
      <div className="relative aspect-[4/3] bg-stone-100 dark:bg-white/5">
        {item.picture ? (
          <img src={thumbnail(item.picture, 200)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-display text-4xl font-bold text-stone-300 dark:text-stone-600">
            {item.name.trim().charAt(0)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="break-words font-display text-sm font-bold leading-snug">{item.name}</h3>

        {item.units.length > 1 ? (
          <div role="radiogroup" aria-label={`وحدة ${item.name}`} className="mt-1.5 flex flex-wrap gap-1.5">
            {item.units.map((u) => {
              const picked = u.name === unit?.name;
              return (
                <button
                  key={u.name}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => setUnitName(u.name)}
                  className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition ${
                    picked
                      ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'border-stone-300 text-stone-600 hover:border-stone-400 dark:border-white/15 dark:text-stone-300'
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">{unit?.name}</p>
        )}

        <p className="mt-1.5">
          {price !== null && unit ? (
            <>
              <span className="font-bold tabular-nums">{egp(price)}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400"> / {unit.name}</span>
            </>
          ) : (
            <span className="text-xs text-stone-400">السعر لسه متحددش</span>
          )}
        </p>

        {/* mt-auto: الكروت في نفس الصف أزرارها على نفس السطر مهما طول الاسم */}
        <div className="mt-auto pt-2.5">
          <div className="flex items-center justify-between gap-1 rounded-xl border border-stone-200 p-0.5 focus-within:border-brand-400 dark:border-white/10 dark:focus-within:border-brand-400">
            <button
              type="button"
              aria-label={`زوّد ${item.name}`}
              onClick={() => setQty(qty + 1)}
              disabled={price === null || qty >= MAX_QTY}
              className={stepClass}
            >
              +
            </button>
            <input
              aria-label={`كمية ${item.name}`}
              inputMode="numeric"
              value={qtyText}
              onChange={(e) => setQtyText(latinDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
              onFocus={selectAll}
              onClick={selectAll}
              // فاضية أو صفر وهو ماشي = واحد
              onBlur={() => setQty(qty)}
              disabled={price === null}
              className="w-full min-w-0 bg-transparent text-center text-sm font-bold tabular-nums outline-none disabled:text-stone-300 dark:disabled:text-stone-600"
            />
            <button
              type="button"
              aria-label={`قلّل ${item.name}`}
              onClick={() => setQty(qty - 1)}
              disabled={price === null || qty <= 1}
              className={stepClass}
            >
              −
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
