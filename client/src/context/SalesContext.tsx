import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, type Business } from './AuthContext';
import type { ReceivingMethod } from '../lib/itemUnits';

/**
 * «مبيعات» بطلب العميل: نفس المعرض، بس البائع (المستخدم نفسه، باسم نشاطه)
 * بيبيع لعميل. البيعة بتبدأ من نافذة «مبيعات» في المنيو، وبعدها:
 *   - الرئيسية بتعرض متاجر النشاط ده بس
 *   - الأسعار حسب العميل (تاجر = جملة، فرد = قطاعي) وطريقة الاستلام اللي اتختارت
 *   - اسم المشتري على شمال السلة، والسلة نفسها منفصلة عن سلة المستخدم لنفسه
 *
 * الأطراف: المشتري (العميل)، والبائع (النشاط)، والمحرّر (اللي فاتح — وهو
 * دلوقتي البائع كمان؛ مندوبين البيع بعدين).
 *
 * على الجهاز بس لحد ما الطلبات والفواتير تتعمل في السيرفر.
 */
export interface SalesSession {
  /** بيفرّق سلة البيعة دي عن اللي قبلها */
  id: string;
  /** النشاط البائع */
  accountId: string;
  businessName: string;
  /** العميل من عملاء النشاط. null = عميل غير مسجل */
  customerId: string | null;
  /** الاسم الأدبي */
  buyerName: string;
  phone: string;
  isTrader: boolean;
  /** البائع — دلوقتي المستخدم اللي فاتح */
  sellerName: string;
  method: ReceivingMethod;
  /** عنوان التوصيل كتابة. فاضي في الاستلام */
  address: string;
}

export type SalesDraft = Omit<SalesSession, 'id'>;

interface Sales {
  session: SalesSession | null;
  /** بيعة جديدة بسلة فاضية — أو تعديل البيعة الحالية (نفس النشاط) من غير ما السلة تتمسح */
  start: (draft: SalesDraft) => void;
  end: () => void;
  /** نافذة «مبيعات» — مفتوحة لنشاط، أو null */
  dialogFor: Business | null;
  openDialog: (business: Business) => void;
  closeDialog: () => void;
}

const KEY = 'aswaq_sales';
/** سلة كل بيعة على مفتاح لوحده — StoreCartContext بيقراه */
export const salesCartKey = (session: SalesSession) => `aswaq_sales_cart_${session.id}`;

function readSession(): SalesSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SalesSession) : null;
    return parsed && typeof parsed.id === 'string' && typeof parsed.accountId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // الجهاز رافض — مفيش حاجة تتمسح
  }
}

const SalesContext = createContext<Sales | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<SalesSession | null>(readSession);
  const [dialogFor, setDialogFor] = useState<Business | null>(null);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch {
      // الجهاز رافض يحفظ — البيعة تفضل في الصفحة وبس
    }
  }, [session]);

  const start = useCallback((draft: SalesDraft) => {
    setSession((prev) => {
      if (prev && prev.accountId === draft.accountId) return { ...draft, id: prev.id };
      if (prev) forget(salesCartKey(prev));
      return { ...draft, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
    });
  }, []);

  const end = useCallback(() => {
    setSession((prev) => {
      if (prev) forget(salesCartKey(prev));
      return null;
    });
  }, []);

  // الخروج بيقفل البيعة — الجهاز ممكن يكون مشترك
  useEffect(() => {
    if (!user && session) end();
  }, [user, session, end]);

  const value = useMemo<Sales>(
    () => ({
      session,
      start,
      end,
      dialogFor,
      openDialog: setDialogFor,
      closeDialog: () => setDialogFor(null),
    }),
    [session, start, end, dialogFor],
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): Sales {
  const sales = useContext(SalesContext);
  if (!sales) throw new Error('useSales must be used within SalesProvider');
  return sales;
}
