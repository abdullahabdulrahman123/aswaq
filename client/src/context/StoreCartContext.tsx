import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import { salesCartKey, useSales, type SalesSession } from './SalesContext';

/**
 * سلة المعرض — على الجهاز بس لحد ما الطلبات نفسها تتعمل في السيرفر.
 *
 * السطر الواحد = وحدة واحدة من صنف في متجر (كيس، كرتونة…) بكميتها. ده اللي
 * العميل طلبه في كارت الصنف: كل وحدة ليها سطر لوحده تحت الكومبو، والوحدة
 * اللي اتاخدت بتخرج من الكومبو.
 *
 * سعر الوحدة متخزّن مع السطر عشان الناڤبار يحسب الإجمالي وهو برّه صفحة
 * المتجر (مفيش أصناف محمّلة ساعتها). صفحة المتجر بتحدّثه بـ`repriceStore`
 * لما طريقة الاستلام أو نوع الحساب يغيّروا الأسعار. null = السعر لسه متحددش
 * في الشريحة دي، والسطر ساعتها بيتشال من الإجمالي.
 *
 * في «مبيعات» السلة دي بتاعة البيعة (العميل) مش المستخدم: كل بيعة على مفتاح
 * لوحده، وسلة المستخدم لنفسه بتفضل زي ما هي لحد ما البيعة تخلص.
 *
 * الأوردر = سطور متجر واحد، لمشتري واحد (المستخدم نفسه أو مشتري بيعة). كله
 * بيفضل محفوظ لحد ما يتشال — العميل عايزه كده لأسباب تسويقية — وبرّه المتجر
 * السلة بتعرض عدد الأوردرات المفتوحة.
 */
export interface CartLine {
  shopId: string;
  storeName: string;
  itemId: string;
  itemName: string;
  unitName: string;
  /** عدد صحيح أكبر من صفر — الصفر معناه السطر يتشال */
  qty: number;
  /** سعر الوحدة بالقرش */
  unitPrice: number | null;
}

/** أوردر مفتوح: سطور متجر واحد لمشتري واحد */
export interface OpenOrder {
  /** me:<shopId> لأوردرات المستخدم لنفسه، و<saleId>:<shopId> للبيعات */
  key: string;
  shopId: string;
  storeName: string;
  /** البيعة — null لو الأوردر بتاع المستخدم لنفسه */
  sale: SalesSession | null;
  count: number;
  /** بالقرش — السطور اللي ملهاش سعر مش محسوبة */
  total: number;
}

/** مفتاح السطر: وحدة واحدة من صنف في متجر */
export type LineKey = Pick<CartLine, 'shopId' | 'itemId' | 'unitName'>;

/** المتجر اللي المشتري جوّاه دلوقتي — الناڤبار بيعرض سلته هو، بلون حسب حده الأدنى */
export interface CartFocus {
  shopId: string;
  /** الحد الأدنى للأوردر بالقرش في الشريحة اللي المشتري شايفها. null = مفيش */
  minimum: number | null;
}

interface StoreCart {
  lines: CartLine[];
  linesOf: (shopId: string) => CartLine[];
  /** بيحط سطر جديد أو بيستبدل اللي موجود بنفس المفتاح */
  putLine: (line: CartLine) => void;
  /** صفر أو أقل = السطر يتشال والوحدة ترجع للكومبو */
  setQty: (key: LineKey, qty: number) => void;
  removeLine: (key: LineKey) => void;
  /**
   * أسعار متجر اتغيّرت (طريقة الاستلام أو نوع الحساب). priceOf بترجّع سعر
   * الوحدة بالقرش، أو null لو لسه متحددش، أو undefined لو الصنف ده مش معروض
   * دلوقتي — وساعتها السطر بيفضل بسعره القديم.
   */
  repriceStore: (shopId: string, priceOf: (itemId: string, unitName: string) => number | null | undefined) => void;
  /** إجمالي متجر بالقرش — السطور اللي لسه ملهاش سعر مش محسوبة */
  totalOf: (shopId: string) => number;
  /** عدد الأصناف (مش السطور): الصنف بوحدتين بيتعدّ واحد */
  countOf: (shopId: string) => number;
  total: number;
  count: number;
  focus: CartFocus | null;
  setFocus: (focus: CartFocus | null) => void;
  /** كل الأوردرات المفتوحة على الجهاز — للمستخدم لنفسه وللبيعات */
  orders: OpenOrder[];
  /**
   * يرجّع أوردر محفوظ على السيرفر لسلة على الجهاز (saleId = null للمستخدم
   * لنفسه). السطور اللي على الجهاز بالفعل بتكسب.
   */
  restoreLines: (saleId: string | null, lines: CartLine[]) => void;
  /** يشيل سطور متجر من سلة معيّنة — بعد تأكيد الأوردر */
  clearShop: (saleId: string | null, shopId: string) => void;
}

const sum = (list: CartLine[]) => list.reduce((n, l) => n + (l.unitPrice ?? 0) * l.qty, 0);
const itemCount = (list: CartLine[]) => new Set(list.map((l) => l.itemId)).size;

function ordersOf(lines: CartLine[], sale: SalesSession | null): OpenOrder[] {
  const byShop = new Map<string, CartLine[]>();
  for (const l of lines) byShop.set(l.shopId, [...(byShop.get(l.shopId) ?? []), l]);
  return [...byShop].map(([shopId, list]) => ({
    key: `${sale?.id ?? 'me'}:${shopId}`,
    shopId,
    storeName: list[0].storeName,
    sale,
    count: itemCount(list),
    total: sum(list),
  }));
}

const KEY = 'aswaq_cart_lines';

const Cart = createContext<StoreCart | null>(null);

const same = (line: CartLine, key: LineKey) =>
  line.shopId === key.shopId && line.itemId === key.itemId && line.unitName === key.unitName;

/** بنقرا من الجهاز مرة واحدة، وأي حاجة شكلها غلط بنرميها بدل ما الصفحة تقع */
function readLines(key: string): CartLine[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        Boolean(l) &&
        typeof l === 'object' &&
        typeof (l as CartLine).shopId === 'string' &&
        typeof (l as CartLine).itemId === 'string' &&
        typeof (l as CartLine).unitName === 'string' &&
        Number.isFinite((l as CartLine).qty) &&
        (l as CartLine).qty > 0,
    );
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const { session, sessions } = useSales();
  const key = session ? salesCartKey(session) : KEY;
  // المفتاح والسطور مع بعض: لما البيعة تبدأ أو تخلص السطور بتتقري من المفتاح الجديد
  // قبل أي حفظ، فسطور سلة متتكتبش على مفتاح التانية
  const [cart, setCart] = useState(() => ({ key, lines: readLines(key) }));
  if (cart.key !== key) setCart({ key, lines: readLines(key) });
  const lines = cart.key === key ? cart.lines : readLines(key);
  const [focus, setFocus] = useState<CartFocus | null>(null);

  const setLines = useCallback((next: SetStateAction<CartLine[]>) => {
    setCart((prev) => ({ key: prev.key, lines: typeof next === 'function' ? next(prev.lines) : next }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(cart.key, JSON.stringify(cart.lines));
    } catch {
      // الجهاز رافض يحفظ (تصفح خاص مثلاً) — السلة تفضل في الصفحة وبس
    }
  }, [cart]);

  const putLine = useCallback((line: CartLine) => {
    setLines((prev) => [...prev.filter((l) => !same(l, line)), line]);
  }, [setLines]);

  const removeLine = useCallback((key: LineKey) => {
    setLines((prev) => prev.filter((l) => !same(l, key)));
  }, [setLines]);

  const setQty = useCallback((key: LineKey, qty: number) => {
    setLines((prev) =>
      qty > 0 ? prev.map((l) => (same(l, key) ? { ...l, qty } : l)) : prev.filter((l) => !same(l, key)),
    );
  }, [setLines]);

  const repriceStore = useCallback((shopId: string, priceOf: (itemId: string, unitName: string) => number | null | undefined) => {
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        if (l.shopId !== shopId) return l;
        const unitPrice = priceOf(l.itemId, l.unitName);
        if (unitPrice === undefined || unitPrice === l.unitPrice) return l;
        changed = true;
        return { ...l, unitPrice };
      });
      return changed ? next : prev;
    });
  }, [setLines]);

  /** سلة تانية غير الشغالة بتتعدّل على الجهاز على طول، والشغالة من الحالة */
  const editAt = useCallback(
    (saleId: string | null, change: (prev: CartLine[]) => CartLine[]) => {
      const at = saleId ? salesCartKey({ id: saleId }) : KEY;
      if (at === cart.key) {
        setLines(change);
        return;
      }
      try {
        localStorage.setItem(at, JSON.stringify(change(readLines(at))));
      } catch {
        // الجهاز رافض يحفظ
      }
    },
    [cart.key, setLines],
  );

  const restoreLines = useCallback(
    (saleId: string | null, incoming: CartLine[]) =>
      editAt(saleId, (prev) => [...prev, ...incoming.filter((l) => !prev.some((p) => same(p, l)))]),
    [editAt],
  );

  const clearShop = useCallback(
    (saleId: string | null, shopId: string) => editAt(saleId, (prev) => prev.filter((l) => l.shopId !== shopId)),
    [editAt],
  );

  const value = useMemo<StoreCart>(() => {
    const items = itemCount;
    // السلة الشغالة من الحالة، والباقي من الجهاز — كل تغيير بيتحفظ هناك على طول
    const linesAt = (at: string) => (at === key ? lines : readLines(at));
    const orders = [
      ...ordersOf(linesAt(KEY), null),
      ...sessions.flatMap((sale) => ordersOf(linesAt(salesCartKey(sale)), sale)),
    ];
    return {
      lines,
      linesOf: (shopId) => lines.filter((l) => l.shopId === shopId),
      putLine,
      setQty,
      removeLine,
      repriceStore,
      totalOf: (shopId) => sum(lines.filter((l) => l.shopId === shopId)),
      countOf: (shopId) => items(lines.filter((l) => l.shopId === shopId)),
      total: sum(lines),
      count: items(lines),
      focus,
      setFocus,
      orders,
      restoreLines,
      clearShop,
    };
  }, [key, lines, sessions, focus, putLine, setQty, removeLine, repriceStore, restoreLines, clearShop]);

  return <Cart.Provider value={value}>{children}</Cart.Provider>;
}

export function useStoreCart(): StoreCart {
  const cart = useContext(Cart);
  if (!cart) throw new Error('useStoreCart must be used within StoreCartProvider');
  return cart;
}

/**
 * صفحة المتجر بتقول إن السلة اللي في الناڤبار تخص المتجر ده وحده الأدنى ده —
 * زي useCurrentSeller بالظبط. بيتشال أول ما الصفحة تتقفل.
 */
export function useCartFocus(shopId: string | null, minimum: number | null) {
  const { setFocus } = useStoreCart();
  useEffect(() => {
    if (!shopId) return;
    setFocus({ shopId, minimum });
    return () => setFocus(null);
  }, [setFocus, shopId, minimum]);
}

/**
 * «عالم الأوردر» في «مبيعات»، بطلب العميل: اسم المشتري بيظهر وإنت جوه الأوردر
 * بس. أول ما البائع يخرج منه البيعة بتقفل (وسلتها بتفضل محفوظة):
 *   - صفحة المتجر وفاتورته جوه الأوردر
 *   - الرئيسية جوّاه لحد ما يختار متجر ويحط أول صنف، وبعدها الرجوع ليها خروج
 *   - أي صفحة تانية خروج
 * والبيعة اللي اتقفلت وسلتها فاضية بتتمسح — مفيش أوردر يتحفظ.
 */
export function FollowOrderWorld() {
  const { pathname } = useLocation();
  const { session, sessions, leave, drop } = useSales();
  const { lines, orders } = useStoreCart();

  // بنحكم مع تغيير الصفحة بس (وأول تحميل)، مش مع بداية البيعة: «ابدأ البيع»
  // بيشغّل البيعة قبل ما الانتقال للرئيسية يوصل، وكانت هتتقفل وهي لسه على صفحة النشاط
  const judgedPath = useRef<string | null>(null);
  useEffect(() => {
    if (judgedPath.current === pathname) return;
    judgedPath.current = pathname;
    if (!session) return;
    const inside =
      pathname.startsWith('/store/') || pathname.startsWith('/orders/') || (pathname === '/' && lines.length === 0);
    if (!inside) leave();
  }, [pathname, session, lines.length, leave]);

  useEffect(() => {
    for (const s of sessions) {
      if (s.id !== session?.id && !orders.some((o) => o.sale?.id === s.id)) drop(s.id);
    }
  }, [sessions, session, orders, drop]);

  return null;
}
