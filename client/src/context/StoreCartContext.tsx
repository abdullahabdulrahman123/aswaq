import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type SetStateAction } from 'react';
import { salesCartKey, useSales } from './SalesContext';

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
  const { session } = useSales();
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

  const value = useMemo<StoreCart>(() => {
    const sum = (list: CartLine[]) => list.reduce((n, l) => n + (l.unitPrice ?? 0) * l.qty, 0);
    const items = (list: CartLine[]) => new Set(list.map((l) => l.itemId)).size;
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
    };
  }, [lines, focus, putLine, setQty, removeLine, repriceStore]);

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
