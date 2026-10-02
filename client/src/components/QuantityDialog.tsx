import { useEffect, useRef, useState } from 'react';
import { egp } from '../data/catalog';
import { MAX_QTY, clampQtyOrZero, moneyInput, qtyInput, toPiastres, toPounds } from '../lib/quantity';
import { DialogCloseButton, useBackdropClose } from './DialogClose';
import { Notch, compactFieldClass } from './OutlinedField';

/**
 * نافذة الكمية — بتفتح من (+) على وحدة لسه متطلبتش في كارت الصنف، بطلب العميل:
 * الكمية واحد ومتعلّمة، وعلى يمينها زائد وعلى شمالها ناقص، وبعدهم «تم».
 *
 * مكالمة ٢٨ سبتمبر:
 *   - كله في صف واحد مع «تم»، والنافذة فوق الشاشة مش في النص — الكيبورد كان
 *     بيغطي «تم» والبياع يقفله الأول عشان يدوس.
 *   - في «مبيعات» (editPrice) خانة السعر مكتوب فيها سعر الوحدة والبائع يقدر
 *     يغيّره — مؤقتاً، المصنع بيبيع لكل عميل بسعر حسب الكمية. السعر زي سعر
 *     المتجر = مفيش سعر خاص.
 *
 * مكالمة ١ أكتوبر: الصفر مسموح — صفر و«تم» بيشيل الصنف (كان بيرجع ١ ومحدش
 * يعرف يتراجع عن صنف). (−) بينزل لحد الصفر.
 */
export function QuantityDialog({
  open,
  itemName,
  unitName,
  unitPrice,
  initialQty = 1,
  initialPrice,
  editPrice = false,
  onDone,
  onClose,
}: {
  open: boolean;
  itemName: string;
  unitName: string;
  /** سعر الوحدة من المتجر بالقرش */
  unitPrice: number;
  /** سطر موجود بيتعدّل — كميته */
  initialQty?: number;
  /** السعر اللي البائع كتبه قبل كده على السطر */
  initialPrice?: number;
  editPrice?: boolean;
  /** price: اللي البائع كتبه لو غير سعر المتجر. qty صفر = يتشال */
  onDone: (qty: number, price?: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('1');
  const [priceText, setPriceText] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة: الكمية (واحد، أو كمية السطر) متعلّمة بعد ما النافذة تركّز على الخانة
  useEffect(() => {
    if (!open) return;
    setText(String(initialQty));
    setPriceText(toPounds(initialPrice ?? unitPrice));
    const timer = setTimeout(() => inputRef.current?.select(), 30);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const qty = Number(text) || 0;
  const step = (n: number) => setText(String(clampQtyOrZero(n)));
  const typedPrice = editPrice ? toPiastres(priceText) : null;
  const price = typedPrice ?? initialPrice ?? unitPrice;

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label="الكمية"
      // العرض والمكان في style مش كلاس — نفس سبب باقي النوافذ. فوق الشاشة عشان الكيبورد ميغطيهاش
      style={{ width: 'min(23rem, 94vw)', margin: '0.75rem auto auto' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      {open && (
        <form
          method="dialog"
          className="p-3"
          onSubmit={(e) => {
            e.preventDefault();
            onDone(clampQtyOrZero(qty), editPrice && price !== unitPrice ? price : undefined);
          }}
        >
          <h2 className="truncate pe-8 text-sm font-bold leading-snug">
            {itemName}
            <span className="font-normal text-stone-500 dark:text-stone-400">
              {' '}· {unitName}
              {!editPrice && <span className="tabular-nums"> · {egp(unitPrice)}</span>}
            </span>
          </h2>

          {/* (+) على اليمين و(−) على الشمال، بطلب العميل — والصف كله مع «تم» */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <button type="button" aria-label="زوّد" onClick={() => step(qty + 1)} disabled={qty >= MAX_QTY} className={stepClass}>
              +
            </button>
            <input
              ref={inputRef}
              aria-label="الكمية"
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(qtyInput(e.target.value))}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              onBlur={() => setText(String(clampQtyOrZero(qty)))}
              className="h-10 w-14 shrink-0 rounded-xl border border-brand-500 bg-transparent px-1 text-center text-base font-bold tabular-nums outline-none ring-1 ring-inset ring-brand-500"
            />
            <button type="button" aria-label="قلّل" onClick={() => step(qty - 1)} disabled={qty <= 0} className={stepClass}>
              −
            </button>

            {editPrice && (
              <label className="relative ms-1 block w-20 shrink-0">
                <input
                  aria-label="السعر"
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => setPriceText(moneyInput(e.target.value))}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  className={`${compactFieldClass} h-10 py-0 text-center font-bold tabular-nums`}
                />
                <Notch compact>السعر</Notch>
              </label>
            )}

            <button
              type="submit"
              className="ms-1 h-10 shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              تم
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
            الإجمالي <span className="font-bold tabular-nums text-stone-800 dark:text-stone-100">{egp(price * clampQtyOrZero(qty))}</span>
            {/* غير «التسعير» اللي بيغيّر سعر المتجر لكل العملاء (٣٠ سبتمبر) */}
            {editPrice && <span className="ms-1.5">· السعر ده للفاتورة دي بس</span>}
          </p>
        </form>
      )}
      <DialogCloseButton />
    </dialog>
  );
}

const stepClass =
  'grid h-10 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl font-bold leading-none text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-300 dark:disabled:text-stone-600';
