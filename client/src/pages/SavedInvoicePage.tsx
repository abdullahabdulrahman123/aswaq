import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CancelOrderDialog, CancellationNote } from '../components/CancelOrderDialog';
import { InvoiceSheet } from '../components/InvoiceSheet';
import { PriceDialogFor } from '../components/PriceDialog';
import { useAuth } from '../context/AuthContext';
import { rememberSalesShop, useSales } from '../context/SalesContext';
import { advanceOrder, fetchOrder, orderShopId, type Order } from '../lib/aswaqApi';
import { isOpenState, nextActionOf, stageLabel } from '../lib/orderFlow';
import { PERMISSIONS, can, deniedMessage } from '../lib/permissions';
import { orderToView } from '../lib/invoiceView';
import { ApiError } from '../lib/waslaApi';

/**
 * فاتورة أوردر اتأكد — من السيرفر برقمها. للطباعة وللرجوع ليها من «الطلبات».
 * بتتقري بس: التعديل بعد التأكيد لسه متحددش.
 *
 * جاية من «تأكيد وطباعة» (state.print) بتفتح الطباعة لوحدها أول ما تترسم. زرار
 * «الطلبات» اتشال بطلب العميل (الطلبات من السلة)، وفي «مبيعات» مكانه «فاتورة جديدة».
 *
 * للبائع (النشاط اللي بيبيع): اسم الصنف بيفتح «التسعير» (٣٠ سبتمبر). الفاتورة
 * المؤكدة متتغيّرش — العميل وافق على السعر وممكن تكون اتطبعت — والسعر الجديد
 * للطلبات الجاية بس.
 *
 * مراحل الأوردر (١ أكتوبر): فوق اسم المرحلة (مؤكد / مكتمل)، وللبائع زرار المرحلة
 * اللي بعدها («إتمام»). الفاتورة مبتختفيش — بتنقل مرحلة بس. من ٢ أكتوبر المراحل
 * اللي في النص من إعدادات النشاط البائع، والسيرفر بيبعت اسمها وزرارها.
 *
 * مكالمة ٥ أكتوبر: «إلغاء» بالسبب — للبائع لحد ما تخلص (بصلاحية)، وللمشتري على
 * طلبه هو وهو لسه «مؤكد». والملغية بتقول مين لغاها وليه.
 */
export function SavedInvoicePage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { withToken, user, businesses } = useAuth();
  const { openDialog } = useSales();
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const printOnOpen = (state as { print?: boolean } | null)?.print === true;
  const printed = useRef(false);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    withToken((token) => fetchOrder(token, orderId))
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError && err.status === 404 ? 'الفاتورة دي مش موجودة.' : 'مقدرناش نجيب الفاتورة.');
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, user, withToken]);

  // «تأكيد وطباعة»: الطباعة بعد ما الورقة تترسم، والطلب بيتشال من التاريخ عشان الـrefresh ميطبعش تاني
  useEffect(() => {
    if (!order || !printOnOpen || printed.current) return;
    printed.current = true;
    requestAnimationFrame(() => {
      window.print();
      navigate(pathname, { replace: true, state: null });
    });
  }, [order, printOnOpen, pathname, navigate]);

  if (error || !user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-stone-500 dark:text-stone-400">{error || 'سجّل دخول عشان تشوف الفاتورة.'}</p>;
  }
  if (!order) {
    return <p className="mx-auto max-w-2xl px-4 py-8 text-sm text-stone-500 dark:text-stone-400">بنجيب الفاتورة…</p>;
  }

  // البيعة بتتقفل أول ما الفاتورة المؤكدة تفتح (برا «عالم الأوردر») — فالنشاط من الفاتورة نفسها
  const saleBusiness = order.sale != null ? businesses.find((b) => b.accountId === order.from.acc) : undefined;
  // البائع بس اللي بيسعّر: النشاط اللي الأوردر مطلوب منه
  const canPrice = order.state !== 'draft' && businesses.some((b) => b.accountId === order.from.acc);
  // زرار المرحلة اللي بعدها: للنشاط البائع، ولحد آخر مرحلة
  const nextAction = canPrice ? nextActionOf(order) : undefined;
  const selling = businesses.find((b) => b.accountId === order.from.acc);
  // الإلغاء: البائع لحد ما تخلص، والمشتري (اللي عامل الطلب من المعرض) وهو لسه «مؤكد» بس
  const sellerCancel = canPrice && isOpenState(order.state);
  const buyerCancel = !canPrice && order.sale == null && order.state === 'order';
  const cancelAllowed = buyerCancel || can(selling, PERMISSIONS.invoiceCancel);

  async function handleAdvance() {
    if (!order || advancing) return;
    setAdvancing(true);
    setAdvanceError('');
    try {
      setOrder(await withToken((token) => advanceOrder(token, order.id)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // اتنقل من جهاز تاني — بنعرض اللي عليه دلوقتي
        setOrder(await withToken((token) => fetchOrder(token, order.id)).catch(() => order));
      } else setAdvanceError('مقدرناش ننقل الطلب للمرحلة اللي بعدها. جرّب تاني.');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      {order.state !== 'draft' && (
        <p
          role="status"
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium print:hidden ${
            order.state === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300'
          }`}
        >
          فاتورة رقم {order.number} — {stageLabel(order)}
        </p>
      )}
      <CancellationNote order={order} />
      <InvoiceSheet view={orderToView(order)} onPrice={canPrice ? (l) => setPricingId(l.itemId) : undefined} />
      {pricingId && (
        <PriceDialogFor
          accountId={order.from.acc}
          itemId={pricingId}
          note={`فاتورة رقم ${order.number} متأكدة ومش هتتغيّر — السعر الجديد للطلبات الجاية من «${order.names.store}».`}
          onSaved={() => setPricingId(null)}
          onClose={() => setPricingId(null)}
        />
      )}
      {advanceError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 print:hidden">
          {advanceError}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3 print:hidden">
        {nextAction && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={advancing}
            className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
          >
            {advancing ? 'لحظة…' : nextAction}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          طباعة
        </button>
        {(sellerCancel || buyerCancel) && (
          <button
            type="button"
            aria-disabled={!cancelAllowed}
            onClick={() => {
              if (cancelAllowed) setCancelling(true);
              else setAdvanceError(deniedMessage(PERMISSIONS.invoiceCancel));
            }}
            className={`rounded-xl border border-red-300 px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10 ${cancelAllowed ? '' : 'opacity-40'}`}
          >
            {buyerCancel ? 'إلغاء الطلب' : 'إلغاء الفاتورة'}
          </button>
        )}
        {saleBusiness && (
          <button
            type="button"
            onClick={() => {
              // FollowSalesPanel بيفتح رأس الفاتورة على آخر متجر اتباع منه — متجر الفاتورة دي
              rememberSalesShop(saleBusiness.accountId, orderShopId(order));
              openDialog(saleBusiness);
            }}
            className="rounded-xl border border-accent-600 px-6 py-3 text-sm font-semibold text-accent-700 transition hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-500/10"
          >
            فاتورة جديدة
          </button>
        )}
      </div>
      {cancelling && (
        <CancelOrderDialog
          order={order}
          buyer={buyerCancel}
          onCancelled={(cancelled) => {
            setCancelling(false);
            setOrder(cancelled);
          }}
          onClose={() => setCancelling(false)}
        />
      )}
    </div>
  );
}
