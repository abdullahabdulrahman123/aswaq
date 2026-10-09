import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type Business } from '../context/AuthContext';
import { buyerLabel, lastSalesShop, rememberSalesShop, useSales, type SalesSession } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { advanceOrder, checkoutOrder, fetchOrder, putDraft, putOrderHeader, type Order } from '../lib/aswaqApi';
import { nowMinute, type Delivery } from '../lib/delivery';
import { draftInput, draftRef, rememberDraftId } from '../lib/draftSync';
import { orderToView } from '../lib/invoiceView';
import type { ReceivingMethod } from '../lib/itemUnits';
import { CONFIRM_ACTION, closedMessage, isEditable, isOpenState, nextActionOf, serialTag, stageLabel, stateNumber } from '../lib/orderFlow';
import { PERMISSIONS, can, deniedMessage } from '../lib/permissions';
import { latinDigits } from '../lib/quantity';
import { ApiError, searchCustomers, type Customer } from '../lib/waslaApi';
import { Avatar, personInitial } from './Avatar';
import { stageColor } from '../lib/stageColors';
import { CancelOrderDialog, CancellationNote } from './CancelOrderDialog';
import { DeliveryFields } from './DeliveryFields';
import { FilterIcon } from './FilterIcon';
import { InvoiceSheet, type InvoiceView } from './InvoiceSheet';
import { Notch, compactFieldClass } from './OutlinedField';

const METHODS: { key: ReceivingMethod; label: string }[] = [
  { key: 'pickup', label: 'استلام' },
  { key: 'delivery', label: 'توصيل' },
];

/** أرقام إنجليزي من غير مسافات ولا شُرَط — والـ+ في الأول بس */
const cleanPhone = (text: string) => latinDigits(text).replace(/[\s-]/g, '');

/** أسعار المشتري في «مبيعات» — للبائع بس، عشان الفرق بين خياري غير المسجل يبان (مكالمة ٢٨ سبتمبر) */
const priceHint = (c: Customer) => (c.kind === 'business' ? 'أسعار جملة المحل' : 'أسعار قطاعي المحل');

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
 * «مبيعات» على صفحة أصناف المتجر نفسها، بطلب العميل (مكالمة ١ أكتوبر) — كانت
 * نافذة لوحدها. جزء بيتفتح ويتقفل (أكورديون) فوق الأصناف:
 *   - مفتوح: رأس الفاتورة (SalesForm). في بيعة جديدة الأصناف مستخبية لحد «ابدأ
 *     البيع» أو السهم — من غير مشتري مفيش أسعار، والصنف كان هيروح سلة البائع نفسه
 *   - مقفول (البيعة شغالة): اسم العميل والاستلام، وجنبهم زراير الفاتورة —
 *     عشان البائع ميلفّش على صفحة الفاتورة
 *
 * مكالمة ٢ أكتوبر — كله من هنا، من غير ما الصفحة تتغيّر:
 *   - زرار المرحلة: «تأكيد» بيأكد الفاتورة مكانه، وبعدها نفس الزرار بيبقى «إتمام»
 *     (المرحلة اللي بعدها)، ولما تخلص بيختفي واسم المرحلة بيفضل مكتوب
 *   - «طباعة» لوحدها في أي مرحلة: المسودة بتتطبع «مسودة»، والمؤكدة برقمها
 *   - فلتر (on/off): أصناف الفاتورة بس
 * بعد التأكيد الأصناف تحت بتتعرض بكميات الفاتورة من غير تعديل (الصفحة)، و«فاتورة
 * جديدة» للعميل اللي بعده.
 *
 * مكالمة ٥ أكتوبر: «إلغاء الفاتورة» جنب «فاتورة جديدة» لحد ما تخلص — بالسبب، وبصلاحية
 * «إلغاء فاتورة بيع» للموظف.
 */
export function SalesPanel({
  storeId,
  businessId,
  settle,
  order,
  onOrder,
  onlyInvoice,
  onToggleOnlyInvoice,
}: {
  storeId: string;
  businessId: string;
  /** كل اللي مستني يتحفظ من سلة المتجر يتبعت الأول (useDraftSync) */
  settle: () => Promise<void>;
  /** الفاتورة المؤكدة اللي قدام البائع — null وهي لسه بتتجاب أو لسه مسودة */
  order: Order | null;
  onOrder: (order: Order) => void;
  onlyInvoice: boolean;
  onToggleOnlyInvoice: () => void;
}) {
  const { dialog, session, openDialog, confirmedOrderId, markConfirmed } = useSales();
  const { businesses, withToken } = useAuth();
  const { linesOf, clearShop } = useStoreCart();
  const [busy, setBusy] = useState<'confirm' | 'advance' | 'print' | null>(null);
  const [error, setError] = useState('');
  /** الورقة اللي بتتطبع — مستخبية على الشاشة */
  const [printView, setPrintView] = useState<InvoiceView | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  // الطباعة بعد ما الورقة تترسم
  useEffect(() => {
    if (printView) requestAnimationFrame(() => window.print());
  }, [printView]);

  if (dialog && dialog.business.accountId === businessId) {
    return (
      <section aria-label="مبيعات" data-expanded="true" className="mt-3 rounded-2xl border border-brand-300 bg-white dark:border-brand-500/40 dark:bg-surface-card sm:max-w-xl print:hidden">
        <SalesForm
          key={`${dialog.editing?.id ?? 'new'}-${storeId}`}
          business={dialog.business}
          editing={dialog.editing}
          returnTo={dialog.returnTo}
          currentShopId={storeId}
          confirmedOrder={dialog.editing && confirmedOrderId !== null && order?.id === confirmedOrderId ? order : null}
          onOrder={onOrder}
        />
      </section>
    );
  }
  if (!session || session.accountId !== businessId) return null;
  const sale = session;

  const business = businesses.find((b) => b.accountId === sale.accountId);
  const lines = linesOf(storeId);
  const confirmed = confirmedOrderId !== null;
  /** الفاتورة المؤكدة لسه بتتجاب */
  const loading = confirmed && order?.id !== confirmedOrderId;
  const action = confirmed ? (order && !loading ? nextActionOf(order) : undefined) : CONFIRM_ACTION;

  /** المسودة زي ما السيرفر حسبها — بعد ما كل صنف مستني يوصل */
  async function savedDraft() {
    await settle();
    return withToken((token) => putDraft(token, draftInput(storeId, lines, sale.method, sale, null)));
  }

  async function handleAction() {
    if (busy) return;
    setBusy(confirmed ? 'advance' : 'confirm');
    setError('');
    try {
      if (confirmed) {
        if (!order) return;
        try {
          onOrder(await withToken((token) => advanceOrder(token, order.id)));
        } catch (err) {
          // اتنقل من جهاز تاني — بنعرض اللي عليه دلوقتي
          if (!(err instanceof ApiError && err.status === 409)) throw err;
          onOrder(await withToken((token) => fetchOrder(token, order.id)));
        }
        return;
      }
      const draft = await savedDraft();
      if (!draft) return;
      if (draft.details.some((d) => d.unpriced)) {
        setError('شيل الأصناف اللي سعرها لسه متحددش عشان تقدر تأكد.');
        return;
      }
      const done = await withToken((token) => checkoutOrder(token, draft.id));
      markConfirmed(done.id);
      onOrder(done);
      clearShop(sale.id, storeId);
      rememberDraftId(draftRef(storeId, sale), null);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409 && !confirmed
          ? 'الفاتورة دي اتأكدت قبل كده.'
          : err instanceof ApiError
            ? err.message
            : confirmed
              ? 'مقدرناش ننقل الفاتورة للمرحلة اللي بعدها. جرّب تاني.'
              : 'مقدرناش نأكد الفاتورة. جرّب تاني.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (busy) return;
    if (confirmed) {
      if (order) setPrintView(orderToView(order));
      return;
    }
    setBusy('print');
    setError('');
    try {
      const draft = await savedDraft();
      if (draft) setPrintView(orderToView(draft));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'مقدرناش نجهّز الفاتورة للطباعة. جرّب تاني.');
    } finally {
      setBusy(null);
    }
  }

  const empty = !confirmed && lines.length === 0;

  return (
    <>
      <section
        aria-label="مبيعات"
        data-expanded="false"
        data-state={confirmed ? (order?.state ?? '') : 'draft'}
        className="mt-3 rounded-2xl border border-brand-300 bg-brand-50/60 p-1.5 dark:border-brand-500/40 dark:bg-brand-500/10 sm:max-w-xl print:hidden"
      >
        <div className="flex items-center gap-2">
          {confirmed && !(order && !loading && isEditable(order)) ? (
            // خلصت أو اتلغت أو بقت فاتورة (أو لسه بتتجاب) — الرأس مبيتفتحش
            <div className="min-w-0 flex-1 px-2 py-1">
              <span className="block truncate text-sm font-bold leading-tight">{buyerLabel(sale)}</span>
              <span role="status" className={`block truncate text-[11px] font-semibold leading-tight ${order && !loading ? stageColor(order).text : 'text-gray-500'}`}>
                {order && !loading ? headline(order) : 'بنجيب الفاتورة…'}
              </span>
            </div>
          ) : confirmed && order ? (
            // رسالة العميل ٦ أكتوبر: «اكسباند الجزء اللي فيه مستخدم غير مسجل… وأعدّل الهيدر زي زمان» —
            // من ٢ أكتوبر كان بيتقفل مع «تأكيد». بصلاحية «تعديل بيانات فاتورة البيع»
            <button
              type="button"
              aria-expanded={false}
              aria-label={`بيانات الفاتورة: ${buyerLabel(sale)} — فتح`}
              onClick={() => {
                if (!business) return;
                if (!can(business, PERMISSIONS.invoiceHeader)) {
                  setError(deniedMessage(PERMISSIONS.invoiceHeader));
                  return;
                }
                setError('');
                openDialog(business, sale);
              }}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-1 text-start transition hover:bg-brand-100/70 dark:hover:bg-brand-500/15"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">{buyerLabel(sale)}</span>
                <span role="status" className={`block truncate text-[11px] font-semibold leading-tight ${stageColor(order).text}`}>
                  {headline(order)}
                </span>
              </span>
              <Chevron />
            </button>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              aria-label={`بيانات البيعة: ${buyerLabel(sale)} — فتح`}
              onClick={() => business && openDialog(business, sale)}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-1 text-start transition hover:bg-brand-100/70 dark:hover:bg-brand-500/15"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">{buyerLabel(sale)}</span>
                <span className="block truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                  {sale.method === 'delivery' ? `توصيل — ${sale.address}` : 'استلام من المتجر'}
                </span>
              </span>
              <Chevron />
            </button>
          )}
          {action && (
            <button
              type="button"
              data-action
              onClick={handleAction}
              disabled={empty || loading || busy !== null}
              className="shrink-0 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
            >
              {busy === 'confirm' ? 'بنأكد…' : busy === 'advance' ? 'لحظة…' : action}
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            disabled={empty || loading || busy !== null}
            className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold transition hover:border-gray-400 disabled:opacity-50 dark:border-white/15 dark:bg-transparent"
          >
            {busy === 'print' ? 'لحظة…' : 'طباعة'}
          </button>
          <button
            type="button"
            aria-label="أصناف الفاتورة بس"
            aria-pressed={onlyInvoice}
            title="أصناف الفاتورة بس"
            onClick={onToggleOnlyInvoice}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
              onlyInvoice
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 dark:border-white/15 dark:bg-transparent dark:text-gray-300'
            }`}
          >
            <FilterIcon />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}
        {/* الطلب اللي بيتفتح من «مهامي» ممكن يتلغي من الناحية التانية — مين لغاه وليه */}
        {confirmed && order && !loading && <CancellationNote order={order} className="mt-1.5" />}
        {confirmed && business && (
          <div className="mt-1.5 flex justify-end gap-2">
            {/* مكالمة ٧ أكتوبر: «تحصيل» زرار مش مرحلة — إيصال استلام نقدية في صفحة لوحده، والرجوع بيرجّع هنا */}
            {order && !loading && order.state !== 'cancelled' && (
              <button
                type="button"
                data-collect
                onClick={() => navigate(`/receipt/${order.id}`, { state: { from: 'store' } })}
                className="rounded-xl border border-brand-500 px-4 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                تحصيل
              </button>
            )}
            {order && !loading && isEditable(order) && (
              <button
                type="button"
                aria-disabled={!can(business, PERMISSIONS.invoiceCancel)}
                onClick={() => (can(business, PERMISSIONS.invoiceCancel) ? setCancelling(true) : setError(deniedMessage(PERMISSIONS.invoiceCancel)))}
                className={`rounded-xl border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10 ${
                  can(business, PERMISSIONS.invoiceCancel) ? '' : 'opacity-40'
                }`}
              >
                إلغاء الفاتورة
              </button>
            )}
            <button
              type="button"
              onClick={() => openDialog(business)}
              className="rounded-xl border border-accent-600 px-4 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-500/10"
            >
              فاتورة جديدة
            </button>
          </div>
        )}
      </section>
      {cancelling && order && (
        <CancelOrderDialog
          order={order}
          onCancelled={(cancelled) => {
            setCancelling(false);
            onOrder(cancelled);
          }}
          onClose={() => setCancelling(false)}
        />
      )}
      {printView && (
        <div className="hidden print:block">
          <InvoiceSheet view={printView} />
        </div>
      )}
    </>
  );
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  );
}

/**
 * رأس الفاتورة — نفس اللي كان في نافذة «مبيعات»:
 *   - المتجر اللي البائع بيبيع منه — بيبدأ بالمتجر اللي الصفحة عليه، أو آخر متجر
 *     اتباع منه، و«ابدأ البيع» بيدخل على أصنافه
 *   - العميل: حساب في وصلة. أوله حسابين لغير المسجلين (مستخدم = قطاعي المحل،
 *     شركة = جملة المحل)، والمسجّل بيتلاقي بإيميله أو رقمه كامل — مش بحث جزئي،
 *     عشان محدش يتصفّح أسامي الناس — وبيظهر بصورته
 *   - البائع: دلوقتي اللي فاتح بس
 *   - الاسم الأدبي والموبايل، واستلام ولا توصيل — والتوصيل عنوان كتابة
 */
function SalesForm({
  business,
  editing,
  returnTo,
  currentShopId,
  confirmedOrder,
  onOrder,
}: {
  business: Business;
  editing: SalesSession | null;
  /** الصفحة اللي «مبيعات» اتفتحت منها — «إلغاء» بيرجّع لها */
  returnTo: string;
  currentShopId: string;
  /** فاتورة مؤكدة رأسها بيتعدّل (رسالة العميل ٦ أكتوبر) — «حفظ» بيبعته للسيرفر */
  confirmedOrder: Order | null;
  onOrder: (order: Order) => void;
}) {
  const { closeDialog, start, update } = useSales();
  const { user, withToken } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const sellerName = user?.name ?? user?.email ?? 'أنا';
  const stores = business.premises.filter((p) => p.isStore);

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
  const [shopId, setShopId] = useState('');
  /** ميعاد التسليم وملاحظاته — الافتراضي «دلوقتي» مع كل بيعة جديدة */
  const [delivery, setDelivery] = useState<Delivery>({ deliveryAt: null, deliveryNotes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  /** طلب من المعرض: العميل هو اللي طلبه، فمبيتغيّرش */
  const online = Boolean(confirmedOrder && confirmedOrder.sale == null);

  // كل فتحة: البيعة اللي بتتعدّل، وإلا فورم فاضي على «مستخدم غير مسجل»
  useEffect(() => {
    setBuyer(editing?.buyer ?? null);
    setName(editing?.buyerName ?? '');
    setPhone(editing?.phone ?? '');
    setMethod(editing?.method ?? 'pickup');
    setAddress(editing?.address ?? '');
    setDelivery({ deliveryAt: editing?.deliveryAt ?? nowMinute(), deliveryNotes: editing?.deliveryNotes ?? '' });
    const choices = stores.map((p) => p.id);
    // الصفحة دايماً على متجر من متاجر النشاط (FollowSalesPanel) — هو اللي البائع واقف فيه
    setShopId([currentShopId, editing?.shopId, lastSalesShop(business.accountId)].find((id) => id && choices.includes(id)) ?? choices[0] ?? '');
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
  }, []);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!buyer || saving) return;
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
      deliveryAt: delivery.deliveryAt,
      deliveryNotes: delivery.deliveryNotes.trim(),
      shopId: shopId || undefined,
    };
    // فاتورة مؤكدة: الرأس بيتحفظ في السيرفر الأول، ولو اترفض الأكورديون بيفضل مفتوح بالسبب
    if (confirmedOrder) {
      setSaving(true);
      try {
        const { shopId: _shop, accountId: _acc, businessName: _name, ...header } = draft;
        onOrder(await withToken((token) => putOrderHeader(token, confirmedOrder.id, header)));
      } catch (err) {
        setSaving(false);
        if (err instanceof ApiError && err.status === 403) setError(deniedMessage(PERMISSIONS.invoiceHeader));
        // 409 في فاتورة مفتوحة = بقت فاتورة من جهاز تاني
        else if (err instanceof ApiError && err.status === 409) setError(closedMessage(isOpenState(confirmedOrder.state) ? { ...confirmedOrder, kind: 'invoice' } : confirmedOrder));
        else setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ بيانات الفاتورة.');
        return;
      }
    }
    if (shopId) rememberSalesShop(business.accountId, shopId);
    if (editing) update(draft);
    else start(draft);
    closeDialog();
    // على أصناف المتجر اللي اتختار — الأكورديون بيتقفل والأصناف تحته
    if (shopId && shopId !== currentShopId) navigate(`/store/${shopId}`);
  }

  const optionClass =
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition hover:bg-gray-50 dark:hover:bg-white/5';

  return (
    // مكالمة ٥ أكتوبر: «مفيش سكرول في صفحة مبيعات» — الفورم كله و«ابدأ البيع» باينين على
    // موبايل عادي من غير ما ينزل: الخانات أصغر، وكل خانتين جنب بعض، والاستلام في سطر
    <form onSubmit={handleSubmit} className="p-3.5 sm:p-5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold">
          مبيعات <span className="text-sm font-normal text-gray-500 dark:text-gray-400">— {business.name}</span>
        </h2>
        {/*
          بيقفل الأكورديون زي «ابدأ البيع» (أو «حفظ») بطلب العميل (مكالمة ٢ أكتوبر):
          المتجر والعميل متحددين لوحدهم، فلمّ الجزء من غير كتابة بيبدأ البيعة بيهم.
          «إلغاء» بس اللي بيقفل من غير بيعة
        */}
        <button type="submit" disabled={!buyer} aria-expanded={true} aria-label="اقفل بيانات البيعة" className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/10">
          <Chevron up />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* البائع: دلوقتي اللي فاتح بس — الموظفين ومندوبين البيع بعدين */}
        <div className={`grid gap-2.5 ${stores.length > 0 ? 'grid-cols-2' : ''}`}>
          {stores.length > 0 && (
            <label className="relative block min-w-0">
              <select className={compactFieldClass} value={shopId} disabled={Boolean(confirmedOrder)} onChange={(e) => setShopId(e.target.value)}>
                {stores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Notch compact>المتجر</Notch>
            </label>
          )}
          <label className="relative block min-w-0">
            <select className={compactFieldClass} value="me" onChange={() => undefined}>
              <option value="me">{sellerName}</option>
            </select>
            <Notch compact>البائع</Notch>
          </label>
        </div>

        {/* العميل: كومبو فيه حسابين غير المسجلين، وبحث بالإيميل أو الرقم */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            disabled={online}
            title={online ? 'طلب من المعرض — العميل هو اللي طلبه' : undefined}
            onClick={() => setPickerOpen((v) => !v)}
            className={`${compactFieldClass} flex items-center gap-2 text-start ${pickerOpen ? 'border-brand-500 ring-1 ring-inset ring-brand-500' : ''}`}
          >
            {buyer && !isWalkIn(buyer) && <CustomerAvatar customer={buyer} size={22} />}
            <span className="min-w-0 flex-1 truncate">{buyer ? buyer.name : 'بنجيب العملاء…'}</span>
            {buyer && !pickerOpen && <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">{priceHint(buyer)}</span>}
            <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <Notch compact active={pickerOpen}>
            العميل
          </Notch>

          {pickerOpen && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
              <ul role="listbox" aria-label="العملاء" className="max-h-60 overflow-y-auto">
                {(walkIn ?? []).map((c) => (
                  <li key={c.accountId}>
                    <button type="button" role="option" aria-selected={buyer?.accountId === c.accountId} onClick={() => pick(c)} className={`${optionClass} font-medium text-brand-700 dark:text-brand-300`}>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-xs font-normal text-gray-400">{priceHint(c)}</span>
                    </button>
                  </li>
                ))}
                {Array.isArray(matches) &&
                  matches.map((c) => (
                    <li key={c.accountId}>
                      <button type="button" role="option" aria-selected={buyer?.accountId === c.accountId} onClick={() => pick(c)} className={optionClass}>
                        <CustomerAvatar customer={c} size={28} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="shrink-0 text-xs text-gray-400">{c.kind === 'business' ? 'شركة' : 'مستخدم'}</span>
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
                className="w-full border-t border-gray-200 bg-transparent px-3 py-2.5 text-sm outline-none dark:border-white/10"
              />
              {search.trim() && (
                <p className="px-3 pb-2.5 text-xs text-gray-400">
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

        <div className="grid grid-cols-2 gap-2.5">
          <label className="relative block min-w-0">
            <input
              className={compactFieldClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="مثال: الحاج محمود"
              maxLength={80}
              disabled={online}
            />
            <Notch compact>الاسم الأدبي</Notch>
          </label>

          <label className="relative block min-w-0">
            <input
              className={`${compactFieldClass} text-right tabular-nums`}
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
            <Notch compact>رقم الموبايل</Notch>
          </label>
        </div>

        {/* رسالة العميل ٦ أكتوبر: ميعاد التسليم وملاحظاته قبل «استلام ولا توصيل» */}
        <DeliveryFields
          notched
          value={delivery}
          onChange={(next) => {
            setDelivery(next);
            setError('');
          }}
        />

        <div>
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">الاستلام</span>
            <div role="radiogroup" aria-label="طريقة الاستلام" className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
              {METHODS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={method === o.key}
                  onClick={() => setMethod(o.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    method === o.key
                      ? 'bg-white text-brand-800 shadow-sm dark:bg-surface-card dark:text-brand-200'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {method === 'delivery' && (
            <label className="relative mt-4 block">
              <input
                className={compactFieldClass}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError('');
                }}
                placeholder="مثال: كفر حمودة، جنب الجامع الكبير"
                maxLength={200}
              />
              <Notch compact>عنوان التوصيل</Notch>
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-200 pt-3.5 dark:border-white/10">
        <button
          type="submit"
          disabled={!buyer || saving}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
        >
          {saving ? 'بنحفظ…' : editing ? 'حفظ' : 'ابدأ البيع'}
        </button>
        <button
          type="button"
          onClick={() => {
            closeDialog();
            // رسالة العميل ٦ أكتوبر: «الغاء» في بيعة جديدة مبيدخلش على الأصناف — بيرجع للصفحة اللي كان
            // فيها، أو الرئيسية لو كان على متجر. في التعديل بيرجع للفاتورة زي ما هي
            if (!editing) navigate(returnTo.startsWith('/store/') ? '/' : returnTo);
          }}
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium transition hover:border-gray-400 dark:border-white/15"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

/** سطر الحالة تحت اسم المشتري (مكالمة ٨ أكتوبر): رقم الحالة اللي هو فيها، والمرحلة، والمرجع الكبير */
function headline(order: Order): string {
  const tag = serialTag(order);
  return `${stateNumber(order, true)} — ${stageLabel(order)}${tag ? ` · ${tag}` : ''}`;
}
