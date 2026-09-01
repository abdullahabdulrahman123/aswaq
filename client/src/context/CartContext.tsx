import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { productById, rules, type Product } from '../data/catalog';

/**
 * نوع المشتري يحدد الأسعار المعروضة.
 * 'retail' = زبون عادي، 'wholesale' = حساب تاجر معتمد.
 * في النسخة الحقيقية ده بييجي من حساب المستخدم بعد اعتماد الإدارة،
 * وهنا مجرد مفتاح تبديل عشان نعرض الفرق للعميل.
 */
export type BuyerType = 'retail' | 'wholesale';

export interface CartLine {
  productId: string;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  buyerType: BuyerType;
  setBuyerType: (t: BuyerType) => void;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  meetsMinimum: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

/** سعر الوحدة حسب نوع المشتري والكمية — شرائح الجملة تُطبّق تصاعدياً */
export function unitPrice(product: Product, qty: number, buyerType: BuyerType): number {
  if (buyerType === 'retail') return product.price;
  const tier = [...product.tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .filter((t) => qty >= t.minQty)
    .pop();
  return tier ? tier.price : product.price;
}

/** الشريحة التالية — نعرضها كحافز "زوّد كذا توفّر كذا" */
export function nextTier(product: Product, qty: number) {
  return [...product.tiers].sort((a, b) => a.minQty - b.minQty).find((t) => qty < t.minQty);
}

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem('aswaq_cart');
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadLines);
  const [buyerType, setBuyerType] = useState<BuyerType>(
    () => (localStorage.getItem('aswaq_buyer') as BuyerType) || 'retail',
  );

  useEffect(() => {
    localStorage.setItem('aswaq_cart', JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem('aswaq_buyer', buyerType);
  }, [buyerType]);

  function add(productId: string, qty = 1) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { productId, qty }];
    });
  }

  function setQty(productId: string, qty: number) {
    if (qty <= 0) return remove(productId);
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty } : l)));
  }

  function remove(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function clear() {
    setLines([]);
  }

  const { count, subtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const line of lines) {
      const product = productById(line.productId);
      if (!product) continue;
      count += line.qty;
      subtotal += unitPrice(product, line.qty, buyerType) * line.qty;
    }
    return { count, subtotal };
  }, [lines, buyerType]);

  const shipping = subtotal === 0 || subtotal >= rules.freeShippingOver ? 0 : rules.flatShipping;
  const meetsMinimum = subtotal >= rules.minOrderValue;

  return (
    <CartContext.Provider
      value={{
        lines,
        buyerType,
        setBuyerType,
        add,
        setQty,
        remove,
        clear,
        count,
        subtotal,
        shipping,
        total: subtotal + shipping,
        meetsMinimum,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
