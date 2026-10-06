import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales, type SalesSession } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { fetchOrders, fetchPurchases, orderShopId, type Order } from './aswaqApi';
import { fetchStores, type ShowroomStore } from './waslaApi';

/** صف في الليستة — أوردر على الجهاز، أو على السيرفر، أو الاتنين (نفس المفتاح) */
export interface OrderRow {
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
  /** «طلباتي»: سلة المشتري على الجهاز، أو أوردر المشتري فيه الحساب المختار */
  buying: boolean;
  sale: SalesSession | null;
  order: Order | null;
}

/**
 * الأوردرات اللي المستخدم عاملها: اللي على الجهاز، وللي داخل بحسابه اللي على
 * السيرفر كمان — المسودات (حتى اللي من جهاز تاني — الدوسة بترجّع سطورها
 * للجهاز) والأوردرات اللي اتأكدت (الدوسة بتفتح فاتورتها).
 *
 * «طلباتي» بتعرض اللي المستخدم طالبه لنفسه (sale = null)، و«الطلبات الواردة»
 * بتعرض بيعات «مبيعات» اللي لسه متأكدتش — بطلب العميل (مكالمة ٢٨ سبتمبر).
 *
 * رسالة العميل ٦ أكتوبر: «الباسكت اللي فوق بتكويري بدون شرط… محتاج where orders.from =
 * انا او البيزنس اللي انا فاتحه» — أوردرات «طلباتي» من السيرفر بقت اللي المشتري فيها
 * الحساب المختار (fetchPurchases)، مش كل اللي المستخدم عمله لنفسه بأي حساب.
 */
export function useOrderRows() {
  const { orders: local, restoreLines } = useStoreCart();
  const { resume, leave, restore, openConfirmed } = useSales();
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const navigate = useNavigate();
  /** اسم الشركة من وصلة — سطور الجهاز فيها اسم المتجر بس */
  const [stores, setStores] = useState<Map<string, ShowroomStore>>(new Map());
  /** null = لسه بنجيب أو مفيش حساب */
  const [saved, setSaved] = useState<Order[] | null>(null);
  /** «طلباتي» للحساب المختار — null = لسه بنجيب */
  const [purchases, setPurchases] = useState<Order[] | null>(null);
  const buyerAccount = selectedBusiness?.accountId ?? null;
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

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    setPurchases(null);
    withToken((token) => fetchPurchases(token, buyerAccount))
      .then((list) => {
        if (!cancelled) setPurchases(list);
      })
      .catch(() => {
        if (!cancelled) setPurchases([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, withToken, buyerAccount]);

  const rows: OrderRow[] = local.map((o) => ({
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
    buying: !o.sale,
    sale: o.sale,
    order: null,
  }));
  // بيعات «مبيعات» من «أوردراتي» (اللي أنا عاملها)، وأوردرات «طلباتي» من الحساب المختار
  const sources: [Order, boolean][] = [
    ...(saved ?? []).filter((o) => o.sale != null).map((o): [Order, boolean] => [o, false]),
    ...(purchases ?? []).map((o): [Order, boolean] => [o, true]),
  ];
  const seen = new Set<string>();
  for (const [order, buying] of sources) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    const onDevice = order.state === 'draft' ? rows.find((r) => r.local && r.key === order.ref) : undefined;
    if (onDevice) {
      onDevice.state = 'draft';
      onDevice.order = order;
      continue;
    }
    const sale = (order.sale as SalesSession | null) ?? null;
    rows.push({
      key: order.id,
      shopId: orderShopId(order),
      business: order.names.business,
      store: order.names.store,
      buyer: sale ? order.names.buyer : null,
      count: new Set(order.details.map((d) => d.itemId)).size,
      total: order.netTotal,
      state: order.state,
      number: order.number,
      local: false,
      buying,
      sale,
      order,
    });
  }

  function open(row: OrderRow) {
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
          unitPrice: d.unpriced ? null : d.originalPrice,
          // سعر كتبه البائع في «مبيعات» بيرجع معاه
          ...(row.sale && !d.unpriced && d.price !== d.originalPrice ? { price: d.price } : {}),
        })),
      );
    }
    if (row.sale) {
      if (row.local) resume(row.sale.id);
      else restore(row.sale);
    } else leave();
    navigate(`/store/${row.shopId}`);
  }

  /**
   * الطلب الوارد بيتفتح على متجره بشكل «مبيعات» في أي مرحلة (رسالة العميل ٦ أكتوبر)
   * — مش صفحة الفاتورة. بيعة «مبيعات» بترجع زي ما اتبعتت، وطلب المعرض بيعة
   * على مقاسه بالمشتري اللي طلبه (بتتمسح لوحدها أول ما البائع يخرج — FollowOrderWorld)
   */
  function openOnStore(order: Order) {
    openConfirmed((order.sale as SalesSession | null) ?? saleOf(order), order.id);
    navigate(`/store/${orderShopId(order)}`);
  }

  return { rows, open, openOnStore, loading: signedIn && (saved === null || purchases === null), signedIn };
}

/** طلب من المعرض في صورة بيعة — اسم المشتري ورقمه وطريقة الاستلام من الأوردر نفسه */
function saleOf(order: Order): SalesSession {
  return {
    id: `order-${order.id}`,
    accountId: order.from.acc,
    businessName: order.names.business,
    buyer: { accountId: order.to.acc, kind: order.names.buyerKind, name: order.names.buyer, picture: null, abbreviation: null },
    walkIn: false,
    buyerName: '',
    phone: order.names.buyerPhone,
    sellerName: order.seller.name,
    method: order.method,
    address: order.address,
    deliveryAt: order.deliveryAt ?? null,
    deliveryNotes: order.deliveryNotes ?? '',
    shopId: orderShopId(order),
  };
}
