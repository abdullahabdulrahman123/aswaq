import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OrderRowButton } from '../components/OrderRowButton';
import { useAuth } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { egp } from '../data/catalog';
import type { Order } from '../lib/aswaqApi';
import { useOrderRows } from '../lib/orderRows';
import { itemsLabel } from '../lib/quantity';

const timeFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * «الطلبات الواردة» بطلب العميل (٢٧ سبتمبر): الأوردرات المؤكدة اللي مطلوبة من
 * النشاط ده ولسه مخلصتش — عكس السلة اللي بتجيب اللي أنا طالبه. الأحدث فوق،
 * والدوسة بتفتح الفاتورة.
 *
 * مكالمة ٢٨ سبتمبر: دي صفحة سلة البيع — فوق فواتير «مبيعات» اللي لسه
 * متأكدتش (كانت في «طلباتي» ومتلخبطة مع اللي أنا طالبه)، والدوسة بترجّعك جوّاها.
 * المؤكدة منها بتنزل مع باقي الطلبات الواردة.
 *
 * بتتحدّث لوحدها (الـsocket.io في IncomingContext). والطلب اللي بيوصل وانت
 * نازل تحت في الليستة مبيزقّش الصفحة: بيطلع زرار «طلبات جديدة ↑» زي
 * Thunderbird، والدوسة عليه بتطلعك فوق.
 */
export function IncomingOrdersPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { businesses, selectedBusiness } = useAuth();
  const { orders, markSeen, live } = useIncoming();
  const { rows, open } = useOrderRows();
  const business = businesses.find((b) => b.accountId === accountId);
  const openSales = rows.filter((row) => row.sale?.accountId === accountId && row.state !== 'order');

  // الصفحة مفتوحة = اللي فيها اتشاف، والعداد يتصفّر (ومع كل طلب بيوصل وهي مفتوحة)
  useEffect(() => {
    if (orders) markSeen();
  }, [orders, markSeen]);

  // «طلبات جديدة ↑»: اللي وصل وانت مش فوق
  const [above, setAbove] = useState(0);
  const firstId = useRef<string | null>(null);
  useLayoutEffect(() => {
    const top = orders?.[0]?.id ?? null;
    if (firstId.current && top && top !== firstId.current && window.scrollY > 120) {
      const known = orders!.findIndex((o) => o.id === firstId.current);
      setAbove((n) => n + (known > 0 ? known : 1));
    }
    firstId.current = top;
  }, [orders]);
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY <= 120) setAbove(0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!business || selectedBusiness?.accountId !== accountId) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-stone-500 dark:text-stone-400">بنجيب الطلبات…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الطلبات الواردة</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        الطلبات المطلوبة من {business.name}، وفواتير «مبيعات».
        {live && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-accent-500 align-middle" title="بتتحدّث لوحدها" />}
      </p>

      {above > 0 && (
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setAbove(0);
          }}
          className="fixed start-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card rtl:translate-x-1/2"
        >
          {above === 1 ? 'طلب جديد' : `${above} طلبات جديدة`} ↑
        </button>
      )}

      {openSales.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-300">فواتير بيع لسه متأكدتش</h2>
          <ul aria-label="فواتير البيع المفتوحة" className="mt-2 grid grid-cols-1 gap-2.5">
            {openSales.map((row) => (
              <OrderRowButton key={row.key} row={row} title={row.buyer ?? row.store} onOpen={() => open(row)} />
            ))}
          </ul>
        </section>
      )}

      {orders === null ? (
        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">بنجيب الطلبات…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-400 dark:border-white/15">
          {openSales.length > 0 ? 'مفيش طلبات مؤكدة لسه.' : 'مفيش طلبات واردة لسه. أول ما حد يأكد طلب من متاجرك هيظهر هنا على طول.'}
        </p>
      ) : (
        // grid-cols-1 = عمود minmax(0,1fr) — عشان الاسم الطويل يتقص بدل ما الصفحة توسع على الموبايل
        <ul aria-label="الطلبات الواردة" className="mt-5 grid grid-cols-1 gap-2.5">
          {orders.map((order) => (
            <IncomingRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function IncomingRow({ order }: { order: Order }) {
  const count = new Set(order.details.map((d) => d.itemId)).size;
  return (
    <li>
      <Link
        to={`/invoice/${order.id}`}
        className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-start transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-display font-bold">{order.names.buyer}</span>
            <span className="shrink-0 rounded-md bg-accent-50 px-1.5 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
              فاتورة {order.number}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-stone-500 dark:text-stone-400">
            {order.names.store} · {order.method === 'delivery' ? 'توصيل' : 'استلام'}
          </span>
          <span className="mt-0.5 block text-xs text-stone-400">{timeFormat.format(new Date(order.checkedOutAt ?? order.updatedAt))}</span>
        </span>
        <span className="shrink-0 text-end">
          <span className="block text-sm font-bold tabular-nums">{egp(order.netTotal)}</span>
          <span className="block text-xs text-stone-500 dark:text-stone-400">{itemsLabel(count)}</span>
        </span>
      </Link>
    </li>
  );
}
