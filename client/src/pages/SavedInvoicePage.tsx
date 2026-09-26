import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvoiceSheet } from '../components/InvoiceSheet';
import { useAuth } from '../context/AuthContext';
import { fetchOrder, type Order } from '../lib/aswaqApi';
import { orderToView } from '../lib/invoiceView';
import { ApiError } from '../lib/waslaApi';

/**
 * فاتورة أوردر اتأكد — من السيرفر برقمها. للطباعة وللرجوع ليها من «الطلبات».
 * بتتقري بس: التعديل بعد التأكيد لسه متحددش.
 */
export function SavedInvoicePage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { withToken, user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

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

  if (error || !user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-stone-500 dark:text-stone-400">{error || 'سجّل دخول عشان تشوف الفاتورة.'}</p>;
  }
  if (!order) {
    return <p className="mx-auto max-w-2xl px-4 py-8 text-sm text-stone-500 dark:text-stone-400">بنجيب الفاتورة…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      {order.state !== 'draft' && (
        <p className="mb-4 rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300 print:hidden">
          اتأكد الطلب — فاتورة رقم {order.number}
        </p>
      )}
      <InvoiceSheet view={orderToView(order)} />
      <div className="mt-5 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          اطبع / PDF
        </button>
        <Link to="/orders" className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15">
          الطلبات
        </Link>
      </div>
    </div>
  );
}
