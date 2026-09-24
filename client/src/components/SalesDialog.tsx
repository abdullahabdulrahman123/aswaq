import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSales } from '../context/SalesContext';
import { fetchCustomers, postCustomer, type Customer } from '../lib/aswaqApi';
import type { ReceivingMethod } from '../lib/itemUnits';
import { latinDigits } from '../lib/quantity';
import { ApiError } from '../lib/waslaApi';
import { Notch, fieldClass } from './OutlinedField';

const METHODS: { key: ReceivingMethod; label: string }[] = [
  { key: 'pickup', label: 'استلام' },
  { key: 'delivery', label: 'توصيل' },
];

const KINDS: { trader: boolean; label: string }[] = [
  { trader: true, label: 'تاجر (جملة)' },
  { trader: false, label: 'فرد (قطاعي)' },
];

/** بديل العميل المسجل — لما المشتري مش في عملاء النشاط */
const UNREGISTERED = 'عميل غير مسجل';

const legendClass = 'mb-2 block text-xs font-medium text-stone-500 dark:text-stone-400';

/** أرقام إنجليزي من غير مسافات ولا شرط — والـ+ في الأول بس */
const cleanPhone = (text: string) => latinDigits(text).replace(/[\s-]/g, '');

function Segmented<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === o.key
              ? 'bg-white text-brand-800 shadow-sm dark:bg-surface-card dark:text-brand-200'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * نافذة «مبيعات» بطلب العميل: بتفتح من المنيو قبل المعرض. فيها العميل (كومبو
 * بسيرش من عملاء النشاط، وأوله «عميل غير مسجل»)، والبائع (دلوقتي اللي فاتح
 * بس)، والموبايل والاسم الأدبي، وتاجر ولا فرد، واستلام ولا توصيل — والتوصيل
 * بيفتح خانة للعنوان. «ابدأ البيع» بيفتح المعرض بمتاجر النشاط ده بس.
 *
 * العميل الجديد ينفع يتحفظ في عملاء النشاط من هنا — كده القايمة بتكبر لوحدها.
 */
export function SalesDialog() {
  const { dialogFor: business, closeDialog, session, start } = useSales();
  const { user, withToken } = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const open = business !== null;
  const sellerName = user?.name ?? user?.email ?? 'أنا';

  /** null = لسه بنجيب */
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState('');
  /** null = عميل غير مسجل */
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isTrader, setIsTrader] = useState(false);
  const [method, setMethod] = useState<ReceivingMethod>('pickup');
  const [address, setAddress] = useState('');
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة: البيعة الحالية لو لنفس النشاط (تعديل)، وإلا فورم فاضي
  useEffect(() => {
    if (!business) return;
    const current = session?.accountId === business.accountId ? session : null;
    setCustomerId(current?.customerId ?? null);
    setName(current?.buyerName ?? '');
    setPhone(current?.phone ?? '');
    setIsTrader(current?.isTrader ?? false);
    setMethod(current?.method ?? 'pickup');
    setAddress(current?.address ?? '');
    setSaveCustomer(false);
    setPickerOpen(false);
    setSearch('');
    setError('');
    setSaving(false);

    let cancelled = false;
    setCustomers(null);
    setLoadError('');
    withToken((token) => fetchCustomers(token, business.accountId))
      .then((list) => {
        if (!cancelled) setCustomers(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCustomers([]);
        setLoadError(err instanceof ApiError ? err.message : 'مقدرناش نجيب العملاء.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  useEffect(() => {
    if (pickerOpen) searchRef.current?.focus();
  }, [pickerOpen]);

  const matches = useMemo(() => {
    const q = latinDigits(search.trim());
    if (!customers || !q) return customers ?? [];
    return customers.filter((c) => c.name.includes(q) || c.phone.includes(q));
  }, [customers, search]);

  const picked = customers?.find((c) => c.id === customerId) ?? null;

  function pick(customer: Customer | null) {
    setCustomerId(customer?.id ?? null);
    setName(customer?.name ?? '');
    setPhone(customer?.phone ?? '');
    setIsTrader(customer?.isTrader ?? false);
    setSaveCustomer(false);
    setPickerOpen(false);
    setSearch('');
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business || saving) return;
    const buyerName = name.trim();
    const cleanedPhone = cleanPhone(phone);
    if (!/^\+?\d{0,15}$/.test(cleanedPhone)) {
      setError('رقم الموبايل أرقام بس.');
      return;
    }
    if (saveCustomer && !buyerName) {
      setError('اكتب اسم العميل عشان يتحفظ في عملائك.');
      return;
    }
    if (method === 'delivery' && !address.trim()) {
      setError('اكتب عنوان التوصيل.');
      return;
    }

    let id = customerId;
    if (customerId === null && saveCustomer) {
      setSaving(true);
      setError('');
      try {
        const saved = await withToken((token) =>
          postCustomer(token, business.accountId, { name: buyerName, phone: cleanedPhone, isTrader }),
        );
        id = saved.id;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ العميل. جرّب تاني.');
        setSaving(false);
        return;
      }
    }

    start({
      accountId: business.accountId,
      businessName: business.name,
      customerId: id,
      buyerName: buyerName || UNREGISTERED,
      phone: cleanedPhone,
      isTrader,
      sellerName,
      method,
      address: method === 'delivery' ? address.trim() : '',
    });
    closeDialog();
    navigate('/');
  }

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
            {/* العميل: كومبو بسيرش */}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
                className={`${fieldClass} flex items-center gap-2 text-start ${pickerOpen ? 'border-brand-500 ring-1 ring-inset ring-brand-500' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate">{picked ? picked.name : UNREGISTERED}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <Notch active={pickerOpen}>العميل</Notch>

              {pickerOpen && (
                <div className="mt-1.5 overflow-hidden rounded-xl border border-stone-200 dark:border-white/10">
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
                    placeholder="دوّر بالاسم أو الموبايل"
                    className="w-full border-b border-stone-200 bg-transparent px-3 py-2.5 text-sm outline-none dark:border-white/10"
                  />
                  <ul role="listbox" aria-label="العملاء" className="max-h-52 overflow-y-auto">
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={customerId === null}
                        onClick={() => pick(null)}
                        className="block w-full px-3 py-2.5 text-start text-sm font-medium text-brand-700 transition hover:bg-stone-50 dark:text-brand-300 dark:hover:bg-white/5"
                      >
                        {UNREGISTERED}
                      </button>
                    </li>
                    {customers === null ? (
                      <li className="px-3 py-2.5 text-sm text-stone-400">بنجيب العملاء…</li>
                    ) : (
                      matches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={customerId === c.id}
                            onClick={() => pick(c)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5"
                          >
                            <span className="min-w-0 flex-1 truncate">{c.name}</span>
                            {c.phone && (
                              <span dir="ltr" className="shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                                {c.phone}
                              </span>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                    {customers && customers.length > 0 && matches.length === 0 && (
                      <li className="px-3 py-2.5 text-sm text-stone-400">مفيش عميل بالاسم ده.</li>
                    )}
                  </ul>
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
              <span className={legendClass}>نوع العميل</span>
              <Segmented
                label="نوع العميل"
                options={KINDS.map((k) => ({ key: k.trader, label: k.label }))}
                value={isTrader}
                onChange={setIsTrader}
              />
            </div>

            <div>
              <span className={legendClass}>الاستلام</span>
              <Segmented label="طريقة الاستلام" options={METHODS} value={method} onChange={setMethod} />
              {method === 'delivery' && (
                <label className="relative mt-4 block">
                  <input
                    className={fieldClass}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setError('');
                    }}
                    placeholder="الشارع، المنطقة، علامة مميزة"
                    maxLength={200}
                  />
                  <Notch>عنوان التوصيل</Notch>
                </label>
              )}
            </div>

            {customerId === null && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={saveCustomer}
                  onChange={(e) => {
                    setSaveCustomer(e.target.checked);
                    setError('');
                  }}
                  className="h-4 w-4 shrink-0 accent-brand-500"
                />
                احفظه في عملائي
              </label>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
            >
              {saving ? 'بنحفظ العميل…' : session?.accountId === business.accountId ? 'حفظ' : 'ابدأ البيع'}
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
