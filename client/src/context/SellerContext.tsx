import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * «الطرف التاني»: الشركة اللي المستخدم بيشتري منها دلوقتي. صورتها بتظهر على
 * شمال الناڤبار قصاد صورته هو على اليمين — المشتري والبائع، زي ما العميل طلب.
 *
 * الصفحة هي اللي عارفة البائع (صفحة الشركة، أو منتج من منتجاتها)، فهي اللي
 * بتعلن عنه بـuseCurrentSeller، وبيختفي أول ما تتقفل. الصفحة الرئيسية
 * (كل الشركات) مبتعلنش عن حد، فالمكان بيفضل فاضي.
 */
export interface Seller {
  id: string;
  name: string;
  /** لوجو الشركة لو ليها — وإلا بتظهر حروفها */
  picture?: string | null;
  initials: string;
  /** صفحة الشركة — الدوسة على صورتها بترجّع لها */
  href: string;
}

/*
 * سياقين منفصلين: الصفحات بتستخدم اللي بيغيّر بس، فمبتترسمش تاني كل ما
 * البائع يتغيّر — الناڤبار بس اللي بيقرا القيمة.
 */
const SellerValue = createContext<Seller | null>(null);
const SellerSetter = createContext<((seller: Seller | null) => void) | null>(null);

export function SellerProvider({ children }: { children: ReactNode }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  return (
    <SellerSetter.Provider value={setSeller}>
      <SellerValue.Provider value={seller}>{children}</SellerValue.Provider>
    </SellerSetter.Provider>
  );
}

/** البائع اللي بيتعرض دلوقتي — null في أي صفحة مش تبع شركة */
export function useSeller(): Seller | null {
  return useContext(SellerValue);
}

/** الصفحة بتقول هي تبع أنهي شركة. null = مش تبع حد */
export function useCurrentSeller(seller: Seller | null) {
  const setSeller = useContext(SellerSetter);
  if (!setSeller) throw new Error('useCurrentSeller must be used within SellerProvider');

  // القيم نفسها مش الكائن: الصفحة بتعمل كائن جديد مع كل رسمة
  const { id, name, picture, initials, href } = seller ?? {};
  useEffect(() => {
    if (!id || !name || !initials || !href) return;
    setSeller({ id, name, picture, initials, href });
    return () => setSeller(null);
  }, [setSeller, id, name, picture, initials, href]);
}
