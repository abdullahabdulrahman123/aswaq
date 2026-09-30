import { useRef, useState } from 'react';
import { egp } from '../data/catalog';
import { linePrice, useStoreCart, type CartLine } from '../context/StoreCartContext';
import type { ShowroomItem } from '../lib/aswaqApi';
import { thumbnail } from '../lib/cloudinary';
import type { PriceField } from '../lib/itemUnits';
import { MAX_QTY, clampQty, moneyInput, qtyInput, toPiastres, toPounds } from '../lib/quantity';
import { QuantityDialog } from './QuantityDialog';

/** ارتفاع سطر الوحدة بالبيكسل — العجلة بتتحرك سطر سطر */
const ROW = 20;
/** الوحدات اللي ظاهرة في الكارت — الباقي بالسكرول */
const VISIBLE = 2;

type Unit = ShowroomItem['units'][number];

/**
 * كارت الصنف في صفحة المتجر، بالشكل اللي العميل طلبه في مكالمة ٢٨ سبتمبر:
 * ٣ سطور ثابتة بهوامش قليلة (كل سطر ~٢٠ بيكسل)، والصورة ٦٠ بيكسل بالكتير.
 *
 *   السطر الأول: اسم الصنف
 *   السطرين التانيين: وحدتين، كل وحدة في سطرها — اسمها وسعرها، و(+) والكمية
 *   و(−)، والإجمالي في الآخر. مفيش كومبو (العميل شايفه مش مريح).
 *
 * الصنف اللي فيه أكتر من وحدتين (كيس وكرتونة وجرام للميزان) بيعرض وحدتين،
 * والباقي بيتسكرول فوق وتحت سطر سطر زي عجلة المنبه. جنبها سهم صغير بعدد
 * الوحدات اللي مش باينة («+1») — الشكل اللي العميل اختاره من الاقتراحات.
 *
 * الكمية والإجمالي فاضيين لحد ما الوحدة تتطلب، ومفيش لون مختلف للصنف
 * المطلوب — «الأرقام هي اللي معبّرة». (+) على وحدة لسه متطلبتش بيفتح نافذة
 * الكمية، وبعدها (+) و(−) بيزوّدوا ويقلّلوا واحد. الكمية والإجمالي بيتكتبوا
 * كمان: الإجمالي بيحسب أقرب كمية صحيحة من تحت.
 *
 * في «مبيعات» (sellerPrices) السعر نفسه زرار: بيفتح النافذة بخانة السعر عشان
 * البائع يكتب سعر للعميل ده — مؤقتاً، بطلب العميل. السعر الخاص بيبان بلون تاني.
 *
 * أنهي سعر من الأربعة (priceField) بتحدده الصفحة: نوع الحساب، و«مبيعات» ولا المعرض.
 */
export function StoreItemCard({
  item,
  priceField,
  shopId,
  storeName,
  sellerPrices = false,
}: {
  item: ShowroomItem;
  priceField: PriceField;
  shopId: string;
  storeName: string;
  sellerPrices?: boolean;
}) {
  const { linesOf, putLine, setQty, removeLine } = useStoreCart();
  /** الوحدة اللي نافذتها مفتوحة */
  const [asking, setAsking] = useState<string | null>(null);
  const wheel = useRef<HTMLUListElement>(null);
  /** أول وحدة ظاهرة في العجلة */
  const [first, setFirst] = useState(0);

  const mine = new Map(linesOf(shopId).filter((l) => l.itemId === item.id).map((l) => [l.unitName, l]));
  const hiddenBelow = Math.max(0, item.units.length - first - VISIBLE);
  const askingUnit = item.units.find((u) => u.name === asking) ?? null;
  const askingLine = askingUnit ? mine.get(askingUnit.name) : undefined;
  const storePrice = (u: Unit) => u[priceField] ?? null;

  const put = (u: Unit, qty: number, price?: number) =>
    putLine({ shopId, storeName, itemId: item.id, itemName: item.name, unitName: u.name, qty, unitPrice: storePrice(u), ...(price !== undefined ? { price } : {}) });

  return (
    <li className="flex gap-2 rounded-xl border border-stone-200 bg-white p-1.5 dark:border-white/10 dark:bg-surface-card">
      <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-white/5">
        {item.picture ? (
          <img src={thumbnail(item.picture, 120)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-display text-2xl font-bold text-stone-300 dark:text-stone-600">
            {item.name.trim().charAt(0)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="h-5 truncate text-[13px] font-bold leading-5">{item.name}</h3>

        <div className="flex h-10 gap-1">
          <ul
            ref={wheel}
            aria-label={`وحدات ${item.name}`}
            onScroll={(e) => setFirst(Math.round(e.currentTarget.scrollTop / ROW))}
            className="h-10 min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {item.units.map((u) => (
              <UnitRow
                key={u.name}
                itemName={item.name}
                unit={u}
                storePrice={storePrice(u)}
                line={mine.get(u.name)}
                sellerPrices={sellerPrices}
                onAsk={() => setAsking(u.name)}
                onPut={(qty) => put(u, qty, mine.get(u.name)?.price)}
                onQty={(line, qty) => setQty(line, qty)}
                onRemove={(line) => removeLine(line)}
              />
            ))}
          </ul>

          {/* «+1»: وحدات مش باينة — تحت، أو فوق لو نزلت لآخرها */}
          {item.units.length > VISIBLE && (
            <button
              type="button"
              aria-label={hiddenBelow > 0 ? `وحدات تانية تحت (${hiddenBelow})` : `وحدات فوق (${first})`}
              onClick={() => wheel.current?.scrollTo({ top: hiddenBelow > 0 ? (first + 1) * ROW : 0, behavior: 'smooth' })}
              className="flex w-5 shrink-0 flex-col items-center justify-end pb-0.5 text-[10px] font-bold leading-none tabular-nums text-brand-700 dark:text-brand-300"
            >
              {hiddenBelow > 0 ? (
                <>
                  {/* ltr: من غيره الاتجاه العربي بيكتبها «1+» */}
                  <span dir="ltr">+{hiddenBelow}</span>
                  <Chevron down />
                </>
              ) : (
                <>
                  <Chevron />
                  <span dir="ltr">+{first}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {askingUnit && storePrice(askingUnit) !== null && (
        <QuantityDialog
          open
          itemName={item.name}
          unitName={askingUnit.name}
          unitPrice={storePrice(askingUnit)!}
          initialQty={askingLine?.qty ?? 1}
          initialPrice={askingLine?.price}
          editPrice={sellerPrices}
          onDone={(qty, price) => {
            put(askingUnit, qty, price);
            setAsking(null);
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </li>
  );
}

function Chevron({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={down ? 'm6 9 6 6 6-6' : 'm6 15 6-6 6 6'} />
    </svg>
  );
}

/**
 * سطر وحدة: اسمها وسعرها، و(+) والكمية و(−)، والإجمالي. (−) وهي واحد بتشيل
 * السطر. الوحدة اللي ملهاش سعر في الشريحة دي مبتتطلبش.
 */
function UnitRow({
  itemName,
  unit,
  storePrice,
  line,
  sellerPrices,
  onAsk,
  onPut,
  onQty,
  onRemove,
}: {
  itemName: string;
  unit: Unit;
  storePrice: number | null;
  line: CartLine | undefined;
  sellerPrices: boolean;
  onAsk: () => void;
  onPut: (qty: number) => void;
  onQty: (line: CartLine, qty: number) => void;
  onRemove: (line: CartLine) => void;
}) {
  /** null = مش بيكتب دلوقتي، فالخانة بتعرض القيمة المحفوظة */
  const [qtyText, setQtyText] = useState<string | null>(null);
  const [totalText, setTotalText] = useState<string | null>(null);

  const price = line ? linePrice(line) : storePrice;
  const priced = price !== null;
  const total = line && priced ? price * line.qty : null;
  const special = line?.price !== undefined;

  /** الخانة بتتعلّم كلها أول ما تتفتح — اللي يتكتب يحل محلها */
  const selectAll = (el: HTMLInputElement | null) => el?.setSelectionRange(0, el.value.length);

  /** كمية اتكتبت: سطر جديد، أو تعديل، أو صفر = يتشال */
  function apply(qty: number) {
    if (line) {
      if (qty <= 0) onRemove(line);
      else if (qty !== line.qty) onQty(line, Math.min(MAX_QTY, qty));
    } else if (qty > 0) onPut(Math.min(MAX_QTY, qty));
  }

  function commitQty() {
    const typed = qtyText;
    setQtyText(null);
    if (typed !== null && typed !== '') apply(Math.trunc(Number(typed) || 0));
  }

  function commitTotal() {
    const typed = totalText;
    setTotalText(null);
    if (typed === null || typed === '' || !priced || price === 0) return;
    const piastres = toPiastres(typed);
    if (piastres !== null) apply(Math.floor(piastres / price));
  }

  const priceText = priced ? egp(price) : 'السعر لسه متحددش';

  return (
    <li className="flex h-5 snap-start items-center gap-1">
      {sellerPrices && priced ? (
        <button
          type="button"
          aria-label={`سعر ${unit.name}: ${priceText} — تغيير`}
          onClick={onAsk}
          className="min-w-0 flex-1 truncate text-start text-[11.5px] leading-5"
        >
          <span className="font-semibold">{unit.name}</span>{' '}
          <span
            className={`tabular-nums underline decoration-dotted underline-offset-2 ${special ? 'font-semibold text-accent-700 dark:text-accent-300' : 'text-stone-500 dark:text-stone-400'}`}
          >
            {priceText}
          </span>
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[11.5px] leading-5" title={`${unit.name} ${priceText}`}>
          <span className="font-semibold">{unit.name}</span>{' '}
          <span className={priced ? 'tabular-nums text-stone-500 dark:text-stone-400' : 'text-stone-400 dark:text-stone-500'}>{priceText}</span>
        </span>
      )}

      <button
        type="button"
        aria-label={line ? `زوّد ${unit.name}` : `ضيف ${itemName} — ${unit.name}`}
        onClick={() => (line ? onQty(line, clampQty(line.qty + 1)) : onAsk())}
        disabled={!priced || (line ? line.qty >= MAX_QTY : false)}
        className={stepClass}
      >
        +
      </button>

      <input
        aria-label={`كمية ${unit.name}`}
        inputMode="numeric"
        disabled={!priced}
        value={qtyText ?? (line ? String(line.qty) : '')}
        onChange={(e) => setQtyText(qtyInput(e.target.value))}
        onFocus={(e) => selectAll(e.currentTarget)}
        onClick={(e) => selectAll(e.currentTarget)}
        onBlur={commitQty}
        className={`${boxClass} w-7`}
      />

      <button
        type="button"
        aria-label={line && line.qty > 1 ? `قلّل ${unit.name}` : `شيل ${unit.name}`}
        onClick={() => line && (line.qty <= 1 ? onRemove(line) : onQty(line, line.qty - 1))}
        disabled={!line}
        className={stepClass}
      >
        −
      </button>

      <input
        aria-label={`إجمالي ${unit.name}`}
        inputMode="decimal"
        disabled={!priced}
        value={totalText ?? (total !== null ? egp(total).replace(' ج.م', '') : '')}
        onChange={(e) => setTotalText(moneyInput(e.target.value))}
        onFocus={(e) => {
          if (total === null) return;
          const el = e.currentTarget;
          setTotalText(toPounds(total));
          // القيمة بتتغيّر بعد الرسمة — بنعلّمها بعدها
          requestAnimationFrame(() => selectAll(el));
        }}
        onClick={(e) => selectAll(e.currentTarget)}
        onBlur={commitTotal}
        className={`${boxClass} w-12`}
      />
    </li>
  );
}

const stepClass =
  'grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-50 text-sm font-bold leading-none text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-300 dark:disabled:text-stone-600';

const boxClass =
  'h-5 shrink-0 rounded-md border border-stone-300 bg-transparent px-0.5 text-center text-[11px] font-bold leading-none tabular-nums outline-none transition focus:border-brand-500 disabled:border-stone-200 dark:border-white/20 dark:disabled:border-white/10';
