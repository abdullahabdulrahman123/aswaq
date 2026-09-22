import { useEffect, useRef, useState } from 'react';
import { egp } from '../data/catalog';
import { MAX_QTY, clampQty, qtyInput } from '../lib/quantity';

/**
 * نافذة الكمية — بتفتح من زرار (+) اللي جنب كومبو الوحدات في كارت الصنف،
 * بطلب العميل: «ديالوج صغير فيه الكمية واحد وسلكتد، وعلى يمينه زائد وعلى
 * شماله ناقص، وبعديهم زرار تمام». الرقم بيبقى معلّم عشان كيبورد الأرقام
 * يفتح على طول والكتابة تحل محله من غير مسح.
 */
export function QuantityDialog({
  open,
  itemName,
  unitName,
  unitPrice,
  onDone,
  onClose,
}: {
  open: boolean;
  itemName: string;
  unitName: string;
  /** سعر الوحدة بالقرش */
  unitPrice: number;
  onDone: (qty: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('1');

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة بتبدأ من واحد، والرقم متعلّم بعد ما النافذة تركّز على الخانة
  useEffect(() => {
    if (!open) return;
    setText('1');
    const timer = setTimeout(() => inputRef.current?.select(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  const qty = Number(text) || 0;
  const step = (n: number) => setText(String(clampQty(n)));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="الكمية"
      // العرض في style مش كلاس — نفس سبب باقي النوافذ
      style={{ width: 'min(20rem, 88vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      {open && (
        <form
          method="dialog"
          className="p-5 text-center"
          onSubmit={(e) => {
            e.preventDefault();
            onDone(clampQty(qty));
          }}
        >
          <h2 className="font-display text-sm font-bold leading-snug">{itemName}</h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {unitName} · <span className="tabular-nums">{egp(unitPrice)}</span>
          </p>

          {/* (+) على اليمين و(−) على الشمال، بطلب العميل */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="زوّد"
              onClick={() => step(qty + 1)}
              disabled={qty >= MAX_QTY}
              className={stepClass}
            >
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
              onBlur={() => setText(String(clampQty(qty)))}
              className="w-24 rounded-xl border border-brand-500 bg-transparent px-3 py-2.5 text-center text-lg font-bold tabular-nums outline-none ring-1 ring-inset ring-brand-500"
            />
            <button
              type="button"
              aria-label="قلّل"
              onClick={() => step(qty - 1)}
              disabled={qty <= 1}
              className={stepClass}
            >
              −
            </button>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            تم
          </button>
        </form>
      )}
    </dialog>
  );
}

const stepClass =
  'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl font-bold leading-none text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-brand-50 dark:bg-brand-500/15 dark:text-brand-300 dark:disabled:text-stone-600';
