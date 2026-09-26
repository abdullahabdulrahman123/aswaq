import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InvoiceSheet, type InvoiceView } from '../components/InvoiceSheet';
import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales } from '../context/SalesContext';
import { useCartFocus, useStoreCart } from '../context/StoreCartContext';
import { checkoutOrder, putDraft, type Order } from '../lib/aswaqApi';
import { draftInput, rememberedMethod } from '../lib/draftSync';
import { orderToView } from '../lib/invoiceView';
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
 */
export function InvoicePage() {
  const { shopId = '' } = useParams<{ shopId: string }>();
  const { linesOf, totalOf, clearShop } = useStoreCart();
  const { session } = useSales();
  const { user, sessionExpired, selectedBusiness, withToken, signIn } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<ShowroomStore | null>(null);
  const [draft, setDraft] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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

  async function handleCheckout() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    try {
      const done = await withToken((token) => checkoutOrder(token, draft.id));
      clearShop(session?.id ?? null, shopId);
      navigate(`/invoice/${done.id}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'الطلب ده اتأكد قبل كده.'
          : err instanceof ApiError
            ? err.message
            : 'مقدرناش نأكد الطلب. جرّب تاني.',
      );
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">الفاتورة فاضية</h1>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">ضيف أصناف من المتجر الأول.</p>
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
    seller: session?.sellerName ?? '',
    method: session?.method ?? null,
    address: session?.address ?? '',
    lines: lines.map((l) => ({ key: `${l.itemId}|${l.unitName}`, item: l.itemName, unit: l.unitName, quantity: l.qty, price: l.unitPrice })),
    total: totalOf(shopId),
    weightKg: null,
  };
  const view = draft ? orderToView(draft) : local;
  const unpriced = view.lines.some((l) => l.price === null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      <InvoiceSheet view={view} />

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 print:hidden">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3 print:hidden">
        {signedIn ? (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!draft || busy || unpriced}
            className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
          >
            {busy ? 'بنأكد…' : 'تأكيد الطلب'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn('login')}
            className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700"
          >
            سجّل دخول عشان تأكد الطلب
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          اطبع / PDF
        </button>
        <Link
          to={`/store/${shopId}`}
          className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
        >
          ارجع للمتجر
        </Link>
      </div>
      {signedIn && unpriced && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 print:hidden">شيل الأصناف اللي سعرها لسه متحددش عشان تقدر تأكد.</p>
      )}
    </div>
  );
}
