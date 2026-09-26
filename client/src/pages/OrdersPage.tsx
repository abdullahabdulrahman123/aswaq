import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartIcon } from '../components/CartIcon';
import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales, type SalesSession } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { fetchOrders, type Order } from '../lib/aswaqApi';
import { itemsLabel } from '../lib/quantity';
import { fetchStores, type ShowroomStore } from '../lib/waslaApi';

/** صف في الليستة — أوردر على الجهاز، أو على السيرفر، أو الاتنين (نفس المفتاح) */
interface Row {
  key: string;
  shopId: string;
  business: string;
  store: string;
  buyer: string | null;
  count: number;
  total: number;
  /** على السيرفر: draft أو order. null = على الجهاز بس */
  state: string | null;
  number: number | null;
  local: boolean;
  sale: SalesSession | null;
  order: Order | null;
}

/**
 * الطلبات — السلة برّه المتجر بتودّي هنا، بطلب العميل: كل أوردر باسم الشركة
 * والمتجر (ومشتري البيعة لو «مبيعات»)، والدوسة بترجّعك جوّاه. مفيش «طلباتي»
 * لوحدها — العميل شايفها تكرار للسلة.
 *
 * للي داخل بحسابه الليستة من السيرفر كمان: المسودات (حتى اللي من جهاز تاني —
 * الدوسة بترجّع سطورها للجهاز) والأوردرات اللي اتأكدت (الدوسة بتفتح فاتورتها).
 * من غير فلاتر لحد ما الحالات تتحدد، بطلب العميل.
 */
export function OrdersPage() {
  const { orders: local, restoreLines } = useStoreCart();
  const { resume, leave, restore } = useSales();
  const { user, sessionExpired, withToken } = useAuth();
  const navigate = useNavigate();
  /** اسم الشركة من وصلة — سطور الجهاز فيها اسم المتجر بس */
  const [stores, setStores] = useState<Map<string, ShowroomStore>>(new Map());
  /** null = لسه بنجيب أو مفيش حساب */
  const [saved, setSaved] = useState<Order[] | null>(null);
  const signedIn = Boolean(user && !user.demo && !sessionExpired);

  useEffect(() => {
    let cancelled = false;
    fetchStores()
      .then((list) => {
        if (!cancelled) setStores(new Map(list.map((s) => [s.id, s])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    withToken(fetchOrders)
      .then((list) => {
        if (!cancelled) setSaved(list);
      })
      .catch(() => {
        if (!cancelled) setSaved([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, withToken]);

  const rows: Row[] = local.map((o) => ({
    key: o.key,
    shopId: o.shopId,
    business: stores.get(o.shopId)?.business.name ?? '',
    store: o.storeName,
    buyer: o.sale ? buyerLabel(o.sale) : null,
    count: o.count,
    total: o.total,
    state: null,
    number: null,
    local: true,
    sale: o.sale,
    order: null,
  }));
  for (const order of saved ?? []) {
    const onDevice = order.state === 'draft' ? rows.find((r) => r.local && r.key === order.ref) : undefined;
    if (onDevice) {
      onDevice.state = 'draft';
      onDevice.order = order;
      continue;
    }
    const sale = (order.sale as SalesSession | null) ?? null;
    rows.push({
      key: order.id,
      shopId: order.from.subAcc ?? '',
      business: order.names.business,
      store: order.names.store,
      buyer: sale ? order.names.buyer : null,
      count: new Set(order.details.map((d) => d.itemId)).size,
      total: order.netTotal,
      state: order.state,
      number: order.number,
      local: false,
      sale,
      order,
    });
  }

  function open(row: Row) {
    if (row.order && row.order.state !== 'draft') {
      navigate(`/invoice/${row.order.id}`);
      return;
    }
    // مسودة من جهاز تاني: سطورها بترجع للجهاز الأول
    if (!row.local && row.order) {
      restoreLines(
        row.sale?.id ?? null,
        row.order.details.map((d) => ({
          shopId: row.shopId,
          storeName: row.store,
          itemId: d.itemId,
          itemName: d.item,
          unitName: d.unit,
          qty: d.quantity,
          unitPrice: d.unpriced ? null : d.price,
        })),
      );
    }
    if (row.sale) {
      if (row.local) resume(row.sale.id);
      else restore(row.sale);
    } else leave();
    navigate(`/store/${row.shopId}`);
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <CartIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">الطلبات</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          {signedIn && saved === null ? 'بنجيب طلباتك…' : 'مفيش طلبات. ادخل على أي متجر وضيف أصناف.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الطلبات</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">دوس على أي طلب ترجع تكمّله أو تشوف فاتورته.</p>

      <ul aria-label="الطلبات المفتوحة" className="mt-5 grid gap-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => open(row)}
              className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-start transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-display font-bold">{row.business || row.store}</span>
                  {row.state && row.state !== 'draft' ? (
                    <span className="shrink-0 rounded-md bg-accent-50 px-1.5 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                      فاتورة {row.number}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      مسودة
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-stone-500 dark:text-stone-400">
                  {row.store}
                  {row.buyer && <> · بيع لـ{row.buyer}</>}
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="block text-sm font-bold tabular-nums">{egp(row.total)}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">{itemsLabel(row.count)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
