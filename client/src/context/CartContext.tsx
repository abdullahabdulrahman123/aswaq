import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { offerById, rules, variantById } from '../data/catalog';
import { unitPrice, type BuyerType } from '../lib/pricing';

export type { BuyerType };

export interface CartLine {
  offerId: string;
  qty: number;
}

/** لما الزبون يحاول يضيف من شركة تانية — بنمسك الطلب لحد ما يقرر */
export interface PendingAdd {
  offerId: string;
  qty: number;
  currentVendorId: string;
  nextVendorId: string;
}

interface CartContextValue {
  lines: CartLine[];
  /** الشركة المقفولة عليها السلة — الطلب الواحد من شركة واحدة */
  vendorId: string | null;
  buyerType: BuyerType;
  setBuyerType: (t: BuyerType) => void;
  /** يرجّع true لو الإضافة تمت، و false لو اتوقفت عشان شركة مختلفة */
  add: (offerId: string, qty?: number) => boolean;
  pendingAdd: PendingAdd | null;
  /** يفضّي السلة ويبدأ بالشركة الجديدة */
  confirmSwitchVendor: () => void;
  cancelSwitchVendor: () => void;
  setQty: (offerId: string, qty: number) => void;
  remove: (offerId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  weight: number;
  meetsMinimum: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem('aswaq_cart_v2');
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    // نتجاهل أي سطر لعرض اتشال من الكتالوج
    return parsed.filter((l) => offerById(l.offerId));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadLines);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [buyerType, setBuyerType] = useState<BuyerType>(
    () => (localStorage.getItem('aswaq_buyer') as BuyerType) || 'retail',
  );

  useEffect(() => {
    localStorage.setItem('aswaq_cart_v2', JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem('aswaq_buyer', buyerType);
  }, [buyerType]);

  // الشركة مشتقّة من محتويات السلة، مش محفوظة لوحدها — عشان متتعارضش معاها
  const vendorId = useMemo(() => {
    const first = lines[0] && offerById(lines[0].offerId);
    return first ? first.vendorId : null;
  }, [lines]);

  const add = useCallback(
    (offerId: string, qty = 1) => {
      const offer = offerById(offerId);
      if (!offer) return false;

      const currentVendor = (() => {
        const first = lines[0] && offerById(lines[0].offerId);
        return first ? first.vendorId : null;
      })();

      if (currentVendor && currentVendor !== offer.vendorId) {
        setPendingAdd({
          offerId,
          qty,
          currentVendorId: currentVendor,
          nextVendorId: offer.vendorId,
        });
        return false;
      }

      setLines((prev) => {
        const existing = prev.find((l) => l.offerId === offerId);
        if (existing) {
          return prev.map((l) => (l.offerId === offerId ? { ...l, qty: l.qty + qty } : l));
        }
        return [...prev, { offerId, qty }];
      });
      return true;
    },
    [lines],
  );

  function confirmSwitchVendor() {
    if (!pendingAdd) return;
    setLines([{ offerId: pendingAdd.offerId, qty: pendingAdd.qty }]);
    setPendingAdd(null);
  }

  function cancelSwitchVendor() {
    setPendingAdd(null);
  }

  function setQty(offerId: string, qty: number) {
    if (qty <= 0) return remove(offerId);
    setLines((prev) => prev.map((l) => (l.offerId === offerId ? { ...l, qty } : l)));
  }

  function remove(offerId: string) {
    setLines((prev) => prev.filter((l) => l.offerId !== offerId));
  }

  function clear() {
    setLines([]);
  }

  const { count, subtotal, weight } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let weight = 0;
    for (const line of lines) {
      const offer = offerById(line.offerId);
      if (!offer) continue;
      count += line.qty;
      subtotal += unitPrice(offer, line.qty, buyerType) * line.qty;
      weight += (variantById(offer.variantId)?.weight ?? 0) * line.qty;
    }
    return { count, subtotal, weight };
  }, [lines, buyerType]);

  const shipping = subtotal === 0 || subtotal >= rules.freeShippingOver ? 0 : rules.flatShipping;
  const meetsMinimum = subtotal >= rules.minOrderValue;

  return (
    <CartContext.Provider
      value={{
        lines,
        vendorId,
        buyerType,
        setBuyerType,
        add,
        pendingAdd,
        confirmSwitchVendor,
        cancelSwitchVendor,
        setQty,
        remove,
        clear,
        count,
        subtotal,
        shipping,
        total: subtotal + shipping,
        weight,
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
