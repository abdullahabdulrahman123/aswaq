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
 *
 * رسالة العميل ٦ أكتوبر (التانية): الترتيب بيوم التسليم وبعدين الساعة، الأقرب فوق
 * (IncomingContext). فالجديد بينزل في مكانه مش فوق على طول — الزرار بيظهر لو
 * مكانه برا الشاشة، وسهمه لفوق أو لتحت، والدوسة بتوصّلك له وبتعلّم عليه شوية.
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

  // «طلب جديد ↑/↓»: اللي وصل ومكانه برا الشاشة ولسه متشافش. السهم لأول واحد فيهم بترتيب الليستة
  const [fresh, setFresh] = useState<string[]>([]);
  const [where, setWhere] = useState<'up' | 'down' | null>(null);
  const [marked, setMarked] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    if (!orders) return;
    const before = known.current;
    known.current = new Set(orders.map((o) => o.id));
    const arrived = before ? orders.filter((o) => !before.has(o.id)).map((o) => o.id) : [];
    if (arrived.length) setFresh((prev) => [...prev, ...arrived]);
  }, [orders]);
  const waiting = orders?.filter((o) => fresh.includes(o.id)) ?? [];
  const target = waiting[0]?.id ?? null;
  // اللي ظهر على الشاشة اتشاف — بيخرج من العداد. بيتشاف تاني مع كل لفّة
  const locate = useRef<() => void>(() => {});
  locate.current = () => {
    const unseen = waiting.filter((o) => placeOf(o.id)).map((o) => o.id);
    if (unseen.length !== fresh.length) setFresh(unseen);
    setWhere(unseen.length ? placeOf(unseen[0]) : null);
  };
  useLayoutEffect(() => locate.current(), [fresh, orders]);
  useEffect(() => {
    const onScroll = () => locate.current();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!marked) return;
    const off = window.setTimeout(() => setMarked(null), 2500);
    return () => window.clearTimeout(off);
  }, [marked]);

  return (
    <section aria-labelledby="incoming-title" className="mt-6">
      <h2 id="incoming-title" className="font-display text-lg font-bold">الطلبات الواردة</h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        الطلبات المطلوبة من {business.name}، وفواتير «مبيعات».
        {live && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-accent-500 align-middle" title="بتتحدّث لوحدها" />}
      </p>

      {target && where && (
        <button
          type="button"
          onClick={() => {
            rowOf(target)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setMarked(target);
            setFresh([]);
          }}
          className="fixed start-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card rtl:translate-x-1/2"
        >
          {waiting.length === 1 ? 'طلب جديد' : `${waiting.length} طلبات جديدة`} {where === 'up' ? '↑' : '↓'}
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
            <IncomingRow key={order.id} order={order} marked={order.id === marked} onOpen={() => openOnStore(order)} />
          ))}
        </ul>
      )}
    </section>
  );
}

const rowOf = (id: string) => document.querySelector(`[data-order-id="${id}"]`);

/** الصف فوق الشاشة ولا تحتها — null = ظاهر (نصّه بين الشريط اللي فوق واللي تحت) أو مش موجود */
function placeOf(id: string): 'up' | 'down' | null {
  const r = rowOf(id)?.getBoundingClientRect();
  if (!r) return null;
  const middle = (r.top + r.bottom) / 2;
  if (middle < 72) return 'up';
  if (middle > window.innerHeight - 56) return 'down';
  return null;
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
function IncomingRow({ order, marked, onOpen }: { order: Order; marked: boolean; onOpen: () => void }) {
  const count = new Set(order.details.map((d) => d.itemId)).size;
  const color = stageColor(order);
  const measures = [order.totalWeight > 0 ? kg(order.totalWeight) : null, order.totalVolume ? volume(order.totalVolume) : null].filter(Boolean);
  return (
    <li data-order-id={order.id}>
      <button
        type="button"
        onClick={onOpen}
        data-stage-color={order.stateColor ?? ''}
        className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-start transition hover:border-brand-400 dark:bg-surface-card ${
          marked ? 'border-brand-400 ring-2 ring-brand-300 dark:ring-brand-500/50' : 'border-gray-200 dark:border-white/10'
        }`}
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
