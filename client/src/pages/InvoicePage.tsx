import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InvoiceSheet, type InvoiceView } from '../components/InvoiceSheet';
import { PriceDialogFor } from '../components/PriceDialog';
import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales } from '../context/SalesContext';
import { linePrice, useCartFocus, useStoreCart } from '../context/StoreCartContext';
import { checkoutOrder, putDraft, type Order } from '../lib/aswaqApi';
import { draftInput, draftRef, rememberDraftId, rememberedMethod } from '../lib/draftSync';
import { orderToView } from '../lib/invoiceView';
import { buyerPriceField } from '../lib/itemUnits';
import { ApiError, fetchStore, type ShowroomStore } from '../lib/waslaApi';

/**
 * الفاتورة — الدوسة على السلة جوه المتجر بتفتحها، بطلب العميل: أصناف الأوردر
 * وكمياتها وأسعارها والإجمالي بشكل فاتورة الهلال، وبتتطبع أو تتحفظ PDF من
 * «اطبع» (نافذة الطباعة بتاعة الجهاز فيها «Save as PDF»). الناڤبار والأزرار
 * مبيطلعوش في الورقة.
 *
 * للي داخل بحسابه الصفحة بتحفظ السلة مسودة على السيرفر وبتعرضها زي ما السيرفر
 * حسبها (بالوزن)، و«تأكيد الطلب» بيحوّلها أوردر برقم فاتورة. الزائر بيشوف
 * سلته من الجهاز، ومحتاج يسجّل دخول عشان يأكد.
 *
 * مكالمة ٢٨ سبتمبر: «تأكيد وطباعة» على أقصى اليمين — بيحفظ ويفتح الطباعة على طول
 * من غير المرور على صفحة الفاتورة كل مرة.
 *
 * مكالمة ١ أكتوبر: في «مبيعات» زرارين بس — «تأكيد» و«طباعة». «تأكيد» بيفتح
 * الفاتورة المؤكدة بمرحلتها («إتمام» بعدها). من ٢ أكتوبر الأكورديون فوق الأصناف
 * بيأكد ويطبع مكانه (SalesPanel) — الصفحة دي بتتفتح من اسم العميل بس.
 *
 * مكالمة ٣٠ سبتمبر: اسم العميل في الناڤبار بقى بيفتح الفاتورة دي (سلة البيع
 * اتشالت)، فتعديل بياناته من زرار «تعديل العميل» هنا. وفي «مبيعات» اسم الصنف
 * بيفتح «التسعير» — الفاتورة دي لسه متأكدتش فبتاخد السعر الجديد على طول، إلا
 * الصنف اللي البائع كتبله سعر خاص للعميل ده.
 */
type AfterCheckout = 'view' | 'print';

const outlineAccent =
  'rounded-xl border border-accent-600 px-5 py-3 text-sm font-semibold text-accent-700 transition hover:bg-accent-50 disabled:opacity-60 dark:text-accent-300 dark:hover:bg-accent-500/10';

export function InvoicePage() {
  const { shopId = '' } = useParams<{ shopId: string }>();
  const { linesOf, totalOf, clearShop, repriceStore } = useStoreCart();
  const { session, openDialog } = useSales();
  const { user, businesses, sessionExpired, selectedBusiness, withToken, signIn } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<ShowroomStore | null>(null);
  const [draft, setDraft] = useState<Order | null>(null);
  const [error, setError] = useState('');
  /** الزرار اللي بيأكد دلوقتي */
  const [busy, setBusy] = useState<AfterCheckout | null>(null);
  /** الصنف اللي «التسعير» بتاعه مفتوح */
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const lines = linesOf(shopId);
  const signedIn = Boolean(user && !user.demo && !sessionExpired);

  useEffect(() => {
    let cancelled = false;
    fetchStore(shopId)
      .then((s) => {
        if (!cancelled) setStore(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // المسودة زي ما السيرفر حسبها — بطريقة الاستلام اللي على الجهاز، أو بتاعة البيعة
  const signature = JSON.stringify(lines);
  useEffect(() => {
    if (!signedIn || lines.length === 0) return;
    let cancelled = false;
    const method = session?.method ?? rememberedMethod(shopId);
    withToken((token) => putDraft(token, draftInput(shopId, lines, method, session, selectedBusiness?.accountId ?? null)))
      .then((order) => {
        // الصنف الجاي من المتجر بيتبعت لوحده على المسودة دي
        rememberDraftId(draftRef(shopId, session), order?.id ?? null);
        if (!cancelled) setDraft(order);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ الطلب. جرّب تاني.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, shopId, signature, session?.id]);

  // السلة في الناڤبار تفضل على الأوردر ده
  useCartFocus(shopId, null);

  async function handleCheckout(then: AfterCheckout) {
    if (!draft || busy) return;
    setBusy(then);
    setError('');
    try {
      const done = await withToken((token) => checkoutOrder(token, draft.id));
      clearShop(session?.id ?? null, shopId);
      rememberDraftId(draftRef(shopId, session), null);
      navigate(`/invoice/${done.id}`, { replace: true, state: then === 'print' ? { print: true } : null });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'الطلب ده اتأكد قبل كده.'
          : err instanceof ApiError
            ? err.message
            : 'مقدرناش نأكد الطلب. جرّب تاني.',
      );
      setBusy(null);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">الفاتورة فاضية</h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">ضيف أصناف من المتجر الأول.</p>
        <Link to={`/store/${shopId}`} className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">
          ارجع للمتجر
        </Link>
      </div>
    );
  }

  const local: InvoiceView = {
    number: null,
    businessName: store?.business.name ?? '',
    storeName: store?.name ?? lines[0].storeName,
    date: now,
    buyer: session ? buyerLabel(session) : (selectedBusiness?.name ?? user?.name ?? 'زائر'),
    buyerPhone: session?.phone ?? '',
    method: session?.method ?? null,
    address: session?.address ?? '',
    lines: lines.map((l) => ({ key: `${l.itemId}|${l.unitName}`, itemId: l.itemId, item: l.itemName, unit: l.unitName, quantity: l.qty, price: linePrice(l) })),
    total: totalOf(shopId),
    weightKg: null,
  };
  const view = draft ? orderToView(draft) : local;
  const unpriced = view.lines.some((l) => l.price === null);
  const saleBusiness = session ? businesses.find((b) => b.accountId === session.accountId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      {session && saleBusiness && (
        <div className="mb-3 flex justify-end print:hidden">
          <button
            type="button"
            // رأس الفاتورة بيتفتح فوق أصناف المتجر ده (FollowSalesPanel) — مش المتجر اللي البيعة بدأت منه
            onClick={() => openDialog(saleBusiness, session)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:border-gray-400 dark:border-white/15"
          >
            تعديل العميل
          </button>
        </div>
      )}
      <InvoiceSheet view={view} onPrice={session && saleBusiness ? (l) => setPricingId(l.itemId) : undefined} />
      {pricingId && session && (
        <PriceDialogFor
          accountId={session.accountId}
          itemId={pricingId}
          note="الفاتورة دي لسه متأكدتش، فهتاخد السعر الجديد على طول — إلا الصنف اللي كتبتله سعر خاص للعميل ده."
          onSaved={(saved) => {
            // سطور الصنف ده في الفاتورة بسعر المحل الجديد — والسلة المتغيّرة بتتبعت مسودة تاني والسيرفر بيحسب
            const field = buyerPriceField(true, session.buyer.kind === 'business' ? 'COMPANY' : 'INDIVIDUAL');
            repriceStore(shopId, (itemId, unitName) => (itemId === saved.id ? (saved.units.find((u) => u.name === unitName)?.[field] ?? null) : undefined));
            setPricingId(null);
          }}
          onClose={() => setPricingId(null)}
        />
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 print:hidden">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3 print:hidden">
        {signedIn && session ? (
          <>
            <button
              type="button"
              onClick={() => handleCheckout('view')}
              disabled={!draft || Boolean(busy) || unpriced}
              className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {busy ? 'بنأكد…' : 'تأكيد'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:border-gray-400 dark:border-white/15"
            >
              طباعة
            </button>
          </>
        ) : signedIn ? (
          <>
            <button
              type="button"
              onClick={() => handleCheckout('print')}
              disabled={!draft || Boolean(busy) || unpriced}
              className="rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {busy === 'print' ? 'بنأكد…' : 'تأكيد وطباعة'}
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('view')}
              disabled={!draft || Boolean(busy) || unpriced}
              className={outlineAccent}
            >
              {busy === 'view' ? 'بنأكد…' : 'تأكيد الطلب'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => signIn('login')}
            className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700"
          >
            سجّل دخول عشان تأكد الطلب
          </button>
        )}
        {!session && (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:border-gray-400 dark:border-white/15"
          >
            طباعة
          </button>
        )}
        <Link
          to={`/store/${shopId}`}
          className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:border-gray-400 dark:border-white/15"
        >
          ارجع للمتجر
        </Link>
      </div>
      {signedIn && unpriced && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 print:hidden">شيل الأصناف اللي سعرها لسه متحددش عشان تقدر تأكد.</p>
      )}
    </div>
  );
}
