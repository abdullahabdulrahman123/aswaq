import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSales } from '../context/SalesContext';
import type { ReceivingMethod } from '../lib/itemUnits';
import { latinDigits } from '../lib/quantity';
import { ApiError, searchCustomers, type Customer } from '../lib/waslaApi';
import { Avatar, personInitial } from './Avatar';
import { Notch, fieldClass } from './OutlinedField';

const METHODS: { key: ReceivingMethod; label: string }[] = [
  { key: 'pickup', label: 'استلام' },
  { key: 'delivery', label: 'توصيل' },
];

const legendClass = 'mb-2 block text-xs font-medium text-stone-500 dark:text-stone-400';

/** أرقام إنجليزي من غير مسافات ولا شُرَط — والـ+ في الأول بس */
const cleanPhone = (text: string) => latinDigits(text).replace(/[\s-]/g, '');

/** إيميل كامل أو رقم كامل — وصلة مبتدوّرش بأقل من كده */
const searchable = (q: string) => /\S+@\S+\.\S+/.test(q) || cleanPhone(q).replace(/^\+/, '').length >= 8;

function CustomerAvatar({ customer, size }: { customer: Customer; size: number }) {
  return (
    <Avatar
      picture={customer.picture}
      fallback={customer.kind === 'business' ? (customer.abbreviation ?? customer.name) : personInitial(customer.name, undefined)}
      kind={customer.kind === 'business' ? 'business' : 'person'}
      size={size}
      tone="soft"
    />
  );
}

/**
 * نافذة «مبيعات» بطلب العميل — رأس الفاتورة، قبل المعرض:
 *   - العميل: حساب في وصلة. أوله حسابين لغير المسجلين (مستخدم = قطاعي، شركة =
 *     جملة)، والمسجّل بيتلاقي بإيميله أو رقمه كامل — مش بحث جزئي، عشان محدش
 *     يتصفّح أسامي الناس — وبيظهر بصورته
 *   - البائع: دلوقتي اللي فاتح بس
 *   - الاسم الأدبي والموبايل، واستلام ولا توصيل — والتوصيل عنوان كتابة
 *
 * «ابدأ البيع» بيفتح المعرض بمتاجر النشاط ده بس. من اسم المشتري في الناڤبار
 * نفس النافذة بتعدّل البيعة الشغالة.
 */
export function SalesDialog() {
  const { dialog, closeDialog, start, update } = useSales();
  const { user, withToken } = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const business = dialog?.business ?? null;
  const editing = dialog?.editing ?? null;
  const open = dialog !== null;
  const sellerName = user?.name ?? user?.email ?? 'أنا';

  /** null = لسه بنجيب */
  const [walkIn, setWalkIn] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [buyer, setBuyer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  /** نتيجة آخر بحث: null = مفيش بحث، 'loading' = بندوّر */
  const [matches, setMatches] = useState<Customer[] | 'loading' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<ReceivingMethod>('pickup');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة: البيعة اللي بتتعدّل، وإلا فورم فاضي على «مستخدم غير مسجل»
  useEffect(() => {
    if (!dialog) return;
    setBuyer(editing?.buyer ?? null);
    setName(editing?.buyerName ?? '');
    setPhone(editing?.phone ?? '');
    setMethod(editing?.method ?? 'pickup');
    setAddress(editing?.address ?? '');
    setPickerOpen(false);
    setSearch('');
    setMatches(null);
    setError('');

    let cancelled = false;
    setWalkIn(null);
    setLoadError('');
    withToken((token) => searchCustomers(token, ''))
      .then(({ walkIn: list }) => {
        if (cancelled) return;
        setWalkIn(list);
        setBuyer((prev) => prev ?? list[0] ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWalkIn([]);
        setLoadError(err instanceof ApiError ? err.message : 'مقدرناش نجيب العملاء من وصلة.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  useEffect(() => {
    if (pickerOpen) searchRef.current?.focus();
  }, [pickerOpen]);

  // البحث بيستنى لحد ما الإيميل أو الرقم يكمل، ونص ثانية من غير كتابة
  useEffect(() => {
    const q = search.trim();
    if (!searchable(q)) {
      setMatches(null);
      return;
    }
    setMatches('loading');
    let cancelled = false;
    const timer = setTimeout(() => {
      withToken((token) => searchCustomers(token, q.includes('@') ? q : cleanPhone(q)))
        .then(({ matches: found }) => {
          if (!cancelled) setMatches(found);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, withToken]);

  const isWalkIn = (c: Customer | null) => Boolean(c && walkIn?.some((w) => w.accountId === c.accountId));

  function pick(customer: Customer) {
    const fromSearch = !isWalkIn(customer);
    setBuyer(customer);
    // المسجّل: الاسم من حسابه والرقم اللي اتدوّر بيه. غير المسجل: بيتكتبوا
    setName(fromSearch ? customer.name : '');
    setPhone(fromSearch && !search.includes('@') ? cleanPhone(search) : '');
    setPickerOpen(false);
    setSearch('');
    setMatches(null);
    setError('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business || !buyer) return;
    const cleanedPhone = cleanPhone(phone);
    if (!/^\+?\d{0,15}$/.test(cleanedPhone)) {
      setError('رقم الموبايل أرقام بس.');
      return;
    }
    if (method === 'delivery' && !address.trim()) {
      setError('اكتب عنوان التوصيل.');
      return;
    }

    const draft = {
      accountId: business.accountId,
      businessName: business.name,
      buyer,
      walkIn: isWalkIn(buyer),
      buyerName: name.trim(),
      phone: cleanedPhone,
      sellerName,
      method,
      address: method === 'delivery' ? address.trim() : '',
    };
    if (editing) {
      update(draft);
      closeDialog();
      return;
    }
    start(draft);
    closeDialog();
    navigate('/');
  }

  const optionClass =
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5';

  return (
    <dialog
      ref={dialogRef}
      onClose={closeDialog}
      aria-label="مبيعات"
      // العرض في style مش كلاس — نفس سبب باقي النوافذ
      style={{ width: 'min(30rem, 92vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      {business && (
        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">مبيعات</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{business.name}</p>

          <div className="mt-6 space-y-5">
            {/* العميل: كومبو فيه حسابين غير المسجلين، وبحث بالإيميل أو الرقم */}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
                className={`${fieldClass} flex items-center gap-2 text-start ${pickerOpen ? 'border-brand-500 ring-1 ring-inset ring-brand-500' : ''}`}
              >
                {buyer && !isWalkIn(buyer) && <CustomerAvatar customer={buyer} size={24} />}
                <span className="min-w-0 flex-1 truncate">{buyer ? buyer.name : 'بنجيب العملاء…'}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <Notch active={pickerOpen}>العميل</Notch>

              {pickerOpen && (
                <div className="mt-1.5 overflow-hidden rounded-xl border border-stone-200 dark:border-white/10">
                  <ul role="listbox" aria-label="العملاء" className="max-h-60 overflow-y-auto">
                    {(walkIn ?? []).map((c) => (
                      <li key={c.accountId}>
                        <button type="button" role="option" aria-selected={buyer?.accountId === c.accountId} onClick={() => pick(c)} className={`${optionClass} font-medium text-brand-700 dark:text-brand-300`}>
                          {c.name}
                        </button>
                      </li>
                    ))}
                    {Array.isArray(matches) &&
                      matches.map((c) => (
                        <li key={c.accountId}>
                          <button type="button" role="option" aria-selected={buyer?.accountId === c.accountId} onClick={() => pick(c)} className={optionClass}>
                            <CustomerAvatar customer={c} size={28} />
                            <span className="min-w-0 flex-1 truncate">{c.name}</span>
                            <span className="shrink-0 text-xs text-stone-400">{c.kind === 'business' ? 'شركة' : 'مستخدم'}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setPickerOpen(false);
                      }
                    }}
                    dir="auto"
                    inputMode="email"
                    placeholder="عميل مسجّل؟ اكتب إيميله أو رقمه كامل"
                    className="w-full border-t border-stone-200 bg-transparent px-3 py-2.5 text-sm outline-none dark:border-white/10"
                  />
                  {search.trim() && (
                    <p className="px-3 pb-2.5 text-xs text-stone-400">
                      {matches === 'loading'
                        ? 'بندوّر…'
                        : matches === null
                          ? 'كمّل الإيميل أو الرقم.'
                          : matches.length === 0
                            ? 'مفيش حساب بالإيميل أو الرقم ده.'
                            : ''}
                    </p>
                  )}
                </div>
              )}
              {loadError && <span className="mt-1.5 block text-xs text-red-600 dark:text-red-400">{loadError}</span>}
            </div>

            {/* البائع: دلوقتي اللي فاتح بس — الموظفين ومندوبين البيع بعدين */}
            <label className="relative block">
              <select className={fieldClass} value="me" onChange={() => undefined}>
                <option value="me">{sellerName}</option>
              </select>
              <Notch>البائع</Notch>
            </label>

            <label className="relative block">
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="مثال: الحاج محمود"
                maxLength={80}
              />
              <Notch>الاسم الأدبي</Notch>
            </label>

            <label className="relative block">
              <input
                className={`${fieldClass} text-right tabular-nums`}
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                placeholder="01xxxxxxxxx"
                maxLength={20}
              />
              <Notch>رقم الموبايل</Notch>
            </label>

            <div>
              <span className={legendClass}>الاستلام</span>
              <div role="radiogroup" aria-label="طريقة الاستلام" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5">
                {METHODS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={method === o.key}
                    onClick={() => setMethod(o.key)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      method === o.key
                        ? 'bg-white text-brand-800 shadow-sm dark:bg-surface-card dark:text-brand-200'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {method === 'delivery' && (
                <label className="relative mt-4 block">
                  <input
                    className={fieldClass}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setError('');
                    }}
                    placeholder="مثال: كفر حمودة، جنب الجامع الكبير"
                    maxLength={200}
                  />
                  <Notch>عنوان التوصيل</Notch>
                </label>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
            <button
              type="submit"
              disabled={!buyer}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
            >
              {editing ? 'حفظ' : 'ابدأ البيع'}
            </button>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
