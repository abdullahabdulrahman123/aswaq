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
  /** اسم اللي عمل مسودة «مبيعات» لو حد تاني في الشركة (مكالمة ٨ أكتوبر) — null = أنا */
  by: string | null;
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
 *
 * مكالمة ٨ أكتوبر: مسودات «مبيعات» بتاعة الشركة بتظهر لكل اللي فيها، باسم اللي عملها.
 */
export function useOrderRows() {
  const { orders: local, restoreLines, clearShop } = useStoreCart();
  const { resume, leave, restore, openConfirmed } = useSales();
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const navigate = useNavigate();
  /** اسم الشركة من وصلة — سطور الجهاز فيها اسم المتجر بس */
  const [stores, setStores] = useState<Map<string, ShowroomStore>>(new Map());
  /** null = لسه بنجيب أو مفيش حساب */
  const [saved, setSaved] = useState<Order[] | null>(null);
  /** حسابي في وصلة — من السيرفر مع الأوردرات */
  const [me, setMe] = useState<string | null>(null);
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
      .then(({ orders, me: account }) => {
        if (cancelled) return;
        setSaved(orders);
        setMe(account);
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

  /**
   * بيعات اتأكدت من جهاز تاني أو من زميل في الشركة (مكالمة ٨ أكتوبر) — سلتها اللي فاضلة
   * على الجهاز ده قديمة: متظهرش مسودة، ومتتبعتش تاني فتعمل مسودة مكررة. رقم البيعة
   * مبيتكررش، بعكس سلة «طلباتي» (me:<متجر>) اللي بتتعمل تاني لنفس المتجر
   */
  const confirmedSales = new Set((saved ?? []).filter((o) => o.sale != null && o.state !== 'draft').map((o) => o.ref));
  const leftovers = local.filter((o) => o.sale && confirmedSales.has(o.key));
  const leftoverKeys = leftovers.map((o) => o.key).join();
  useEffect(() => {
    for (const o of leftovers) clearShop(o.sale?.id ?? null, o.shopId);
    // leftoverKeys بدل leftovers: الليستة بتتعمل جديدة مع كل رسمة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftoverKeys, clearShop]);

  const rows: OrderRow[] = local.filter((o) => !leftovers.includes(o)).map((o) => ({
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
    by: null,
    sale: o.sale,
    order: null,
  }));
  // بيعات «مبيعات» من «أوردراتي» (اللي أنا عاملها)، وأوردرات «طلباتي» من الحساب المختار
  const sources: [Order, boolean][] = [
    ...(saved ?? []).filter((o) => o.sale != null).map((o): [Order, boolean] => [o, false]),
    ...(purchases ?? []).map((o): [Order, boolean] => [o, true]),
  ];
  /** اسم اللي عمل المسودة لو مش أنا */
  const createdBy = (order: Order) => (me && order.creator.acc !== me ? order.creator.name : null);
  /** حد تاني في الشركة آخر واحد عدّلها — نسخة السيرفر أحدث من اللي على الجهاز */
  const editedElsewhere = (order: Order) => Boolean(me && (order.editor?.acc ?? order.creator.acc) !== me);
  const seen = new Set<string>();
  for (const [order, buying] of sources) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    const onDevice = order.state === 'draft' ? rows.find((r) => r.local && r.key === order.ref) : undefined;
    if (onDevice) {
      onDevice.state = 'draft';
      onDevice.order = order;
      onDevice.by = createdBy(order);
      if (editedElsewhere(order)) {
        onDevice.count = new Set(order.details.map((d) => d.itemId)).size;
        onDevice.total = order.netTotal;
      }
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
      by: createdBy(order),
      sale,
      order,
    });
  }

  function open(row: OrderRow) {
    if (row.order && row.order.state !== 'draft') {
      navigate(`/invoice/${row.order.id}`);
      return;
    }
    // مسودة من جهاز تاني: سطورها بترجع للجهاز الأول. ولو حد تاني في الشركة آخر واحد
    // عدّلها (مكالمة ٨ أكتوبر) نسخة السيرفر هي اللي بتتفتح، مش اللي فاضلة على الجهاز
    const newer = Boolean(row.order && editedElsewhere(row.order));
    if (row.order && (!row.local || newer)) {
      if (row.local) clearShop(row.sale?.id ?? null, row.shopId);
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
      if (row.local && !newer) resume(row.sale.id);
      else restore((row.order?.sale as SalesSession | null) ?? row.sale);
    } else leave();
    // البيعة اللي بتتفتح من الليستة بتيجي على أصناف فاتورتها بس (مكالمة ٨ أكتوبر)
    navigate(`/store/${row.shopId}`, { state: { filtered: true } satisfies StoreOpening });
  }

  /**
   * الطلب الوارد بيتفتح على متجره بشكل «مبيعات» في أي مرحلة (رسالة العميل ٦ أكتوبر)
   * — مش صفحة الفاتورة. بيعة «مبيعات» بترجع زي ما اتبعتت، وطلب المعرض بيعة
   * على مقاسه بالمشتري اللي طلبه (بتتمسح لوحدها أول ما البائع يخرج — FollowOrderWorld)
   */
  function openOnStore(order: Order) {
    openConfirmed((order.sale as SalesSession | null) ?? saleOf(order), order.id);
    navigate(`/store/${orderShopId(order)}`, { state: { filtered: true } satisfies StoreOpening });
  }

  return { rows, open, openOnStore, loading: signedIn && (saved === null || purchases === null), signedIn };
}

/** صفحة المتجر اتفتحت من «مهامي» على فاتورة موجودة — فلتر «أصناف الفاتورة بس» شغال من الأول */
export interface StoreOpening {
  filtered?: boolean;
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
