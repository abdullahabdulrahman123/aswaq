import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Business } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { egp } from '../lib/money';
import type { Order } from '../lib/aswaqApi';
import { useOrderRows } from '../lib/orderRows';
import { deliveryLabel } from '../lib/delivery';
import { stageLabel } from '../lib/orderFlow';
import { itemsLabel } from '../lib/quantity';
import { stageColor } from '../lib/stageColors';
import { OrderRowButton } from './OrderRowButton';

const timeFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * «الطلبات الواردة» بطلب العميل (٢٧ سبتمبر): الأوردرات المؤكدة اللي مطلوبة من
 * النشاط ده ولسه مخلصتش — عكس السلة اللي بتجيب اللي أنا طالبه. الأحدث فوق،
 * والدوسة بتفتح الطلب على متجره بشكل «مبيعات» (رسالة العميل ٦ أكتوبر — كانت
 * بتفتح صفحة الفاتورة).
 *
 * مكالمة ٢٨ سبتمبر: دي صفحة سلة البيع — فوق فواتير «مبيعات» اللي لسه
 * متأكدتش (كانت في «طلباتي» ومتلخبطة مع اللي أنا طالبه)، والدوسة بترجّعك جوّاها.
 * المؤكدة منها بتنزل مع باقي الطلبات الواردة.
 *
 * مكالمة ٣٠ سبتمبر: مبقتش سلة ولا صفحة لوحدها — جوه «مهامي» (TasksPage)،
 * للنشاط المختار. العداد الأحمر على أيقونة «مهامي» اللي تحت.
 *
 * بتتحدّث لوحدها (الـsocket.io في IncomingContext). والطلب اللي بيوصل وانت
 * نازل تحت في الليستة مبيزقّش الصفحة: بيطلع زرار «طلبات جديدة ↑» زي
 * Thunderbird، والدوسة عليه بتطلعك فوق.
 */
export function IncomingOrders({ business }: { business: Business }) {
  const { accountId } = business;
  const { orders, markSeen, live } = useIncoming();
  const { rows, open, openOnStore } = useOrderRows();
  // اللي لسه متأكدتش بس (على الجهاز أو مسودة) — المؤكدة في أي مرحلة تحت مع الواردة، والمكتملة والملغية برا «مهامي»
  const openSales = rows.filter((row) => row.sale?.accountId === accountId && (row.state === null || row.state === 'draft'));

  // الصفحة مفتوحة = التنبيه يختفي (ومع كل طلب بيوصل وهي مفتوحة). العداد بيفضل لحد ما الفاتورة تخلص
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

  return (
    <section aria-labelledby="incoming-title" className="mt-6">
      <h2 id="incoming-title" className="font-display text-lg font-bold">الطلبات الواردة</h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
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
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">فواتير بيع لسه متأكدتش</h3>
          <ul aria-label="فواتير البيع المفتوحة" className="mt-2 grid grid-cols-1 gap-2.5">
            {openSales.map((row) => (
              <OrderRowButton key={row.key} row={row} title={row.buyer ?? row.store} onOpen={() => open(row)} />
            ))}
          </ul>
        </section>
      )}

      {orders === null ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">بنجيب الطلبات…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400 dark:border-white/15">
          {openSales.length > 0 ? 'مفيش طلبات مؤكدة لسه.' : 'مفيش طلبات واردة لسه. أول ما حد يأكد طلب من متاجرك هيظهر هنا على طول.'}
        </p>
      ) : (
        // grid-cols-1 = عمود minmax(0,1fr) — عشان الاسم الطويل يتقص بدل ما الصفحة توسع على الموبايل
        <ul aria-label="الطلبات الواردة" className="mt-5 grid grid-cols-1 gap-2.5">
          {orders.map((order) => (
            <IncomingRow key={order.id} order={order} onOpen={() => openOnStore(order)} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** ١٢٥٠٠ جرام ← «12.5 كجم» */
const kg = (grams: number) => `${(grams / 1000).toLocaleString('en-EG', { maximumFractionDigits: 1 })} كجم`;
/** سم³ ← «0.35 م³»، والصغير باللتر */
const volume = (cm3: number) =>
  cm3 >= 10_000 ? `${(cm3 / 1_000_000).toLocaleString('en-EG', { maximumFractionDigits: 2 })} م³` : `${(cm3 / 1000).toLocaleString('en-EG', { maximumFractionDigits: 1 })} لتر`;

/**
 * صف طلب وارد — رسالة العميل ٦ أكتوبر: رقم الفاتورة لوحده في مربع صغير بلون مرحلتها
 * (هوية بصرية، من «الإعدادات»)، وبعده اسم المشتري. والوزن والحجم لو متسجّلين: اللي
 * مش موجود مبيظهرش ومبياخدش مكان. والميعاد ميعاد التسليم لو اتحدد، وإلا ساعة التأكيد.
 */
function IncomingRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const count = new Set(order.details.map((d) => d.itemId)).size;
  const color = stageColor(order);
  const measures = [order.totalWeight > 0 ? kg(order.totalWeight) : null, order.totalVolume ? volume(order.totalVolume) : null].filter(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        data-stage-color={order.stateColor ?? ''}
        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-display text-sm font-bold leading-snug tabular-nums ${color.box}`}>
              {/* «فاتورة» للقارئ الصوتي ولنسخ النص — مش sr-only عشان النص يفضل «فاتورة 3» في سطر واحد */}
              <span className="text-[0px]">فاتورة </span>
              {order.number}
            </span>
            <span className="truncate font-display font-bold">{order.names.buyer}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
            <span className={`font-semibold ${color.text}`}>{stageLabel(order)}</span> · {order.names.store} · {order.method === 'delivery' ? 'توصيل' : 'استلام'}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-400">
            {order.deliveryAt ? `تسليم ${deliveryLabel(order.deliveryAt)}` : timeFormat.format(new Date(order.checkedOutAt ?? order.updatedAt))}
            {measures.length > 0 && <span className="tabular-nums" data-measures> · {measures.join(' · ')}</span>}
          </span>
        </span>
        <span className="shrink-0 text-end">
          <span className="block text-sm font-bold tabular-nums">{egp(order.netTotal)}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{itemsLabel(count)}</span>
        </span>
      </button>
    </li>
  );
}
