import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectToWasla, waslaConfigured, type WaslaUser } from '../lib/waslaAuth';
import type { AccountType } from '../lib/pricing';
import type { CategoryId } from '../data/catalog';

/**
 * الزبون يتصفح كزائر عادي، وتسجيل الدخول مطلوب عند إتمام الطلب فقط.
 * التسجيل كله عبر وصلة — أسواق مش بيخزّن كلمات سر.
 *
 * وصلة بتقول مين المستخدم وبس. الفرق بين الفرد والشركة بيتحدد هنا في
 * أسواق: اللي عنده نشاط تجاري مسجّل بيبقى شركة، والباقي أفراد.
 * ده الصح لأن النشاط التجاري حاجة تخص أسواق مش منصة الهوية.
 */

export type AuthIntent = 'login' | 'register';

/** نشاط تجاري مسجّل على أسواق — بيحوّل الحساب لحساب شركة */
export interface Business {
  name: string;
  category: CategoryId;
  city: string;
  createdAt: string;
}

interface AuthContextValue {
  user: WaslaUser | null;
  /** النشاط التجاري بتاع المستخدم الحالي، لو عمل واحد */
  business: Business | null;
  createBusiness: (b: Omit<Business, 'createdAt'>) => void;
  deleteBusiness: () => void;
  /** الأسعار بتتبني عليه — الزائر والفرد زي بعض، الشركة بتشوف أسعار الكميات */
  accountType: AccountType;
  /** هل وصلة متوصّلة فعلاً؟ لو لأ بنشتغل بوضع تجريبي واضح للعميل */
  connected: boolean;
  /** الطلب اللي وقفناه لحد ما يسجّل — بيفتح نافذة الدخول */
  gateOpen: boolean;
  gateIntent: AuthIntent;
  openGate: (intent?: AuthIntent) => void;
  closeGate: () => void;
  signIn: (intent: AuthIntent) => Promise<void>;
  setUser: (u: WaslaUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadUser(): WaslaUser | null {
  try {
    const raw = localStorage.getItem('aswaq_user');
    return raw ? (JSON.parse(raw) as WaslaUser) : null;
  } catch {
    return null;
  }
}

/** مفتاح لكل مستخدم — عشان نشاط حد ميظهرش لحد تاني على نفس الجهاز */
const businessKey = (sub: string) => `aswaq_business_${sub}`;

function loadBusiness(sub: string | undefined): Business | null {
  if (!sub) return null;
  try {
    const raw = localStorage.getItem(businessKey(sub));
    return raw ? (JSON.parse(raw) as Business) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<WaslaUser | null>(loadUser);
  const [business, setBusiness] = useState<Business | null>(() => loadBusiness(loadUser()?.sub));
  const [gateOpen, setGateOpen] = useState(false);
  const [gateIntent, setGateIntent] = useState<AuthIntent>('login');

  useEffect(() => {
    if (user) localStorage.setItem('aswaq_user', JSON.stringify(user));
    else localStorage.removeItem('aswaq_user');
    // النشاط التجاري بيتقرا من جديد مع كل تغيير مستخدم
    setBusiness(loadBusiness(user?.sub));
  }, [user]);

  const setUser = useCallback((u: WaslaUser) => {
    setUserState(u);
    setGateOpen(false);
  }, []);

  const createBusiness = useCallback(
    (b: Omit<Business, 'createdAt'>) => {
      if (!user) return;
      const record: Business = { ...b, createdAt: new Date().toISOString() };
      localStorage.setItem(businessKey(user.sub), JSON.stringify(record));
      setBusiness(record);
    },
    [user],
  );

  const deleteBusiness = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(businessKey(user.sub));
    setBusiness(null);
  }, [user]);

  const openGate = useCallback((intent: AuthIntent = 'login') => {
    setGateIntent(intent);
    setGateOpen(true);
  }, []);

  const closeGate = useCallback(() => setGateOpen(false), []);

  const signIn = useCallback(async (intent: AuthIntent) => {
    if (waslaConfigured) {
      await redirectToWasla(window.location.pathname + window.location.search);
      return;
    }
    // وصلة مش متوصّلة (النسخة المنشورة) — جلسة تجريبية معلّمة بوضوح
    setUserState({
      sub: 'demo-user',
      name: intent === 'register' ? 'حساب جديد (تجريبي)' : 'مستخدم تجريبي',
      email: 'demo@aswaq.local',
      demo: true,
    });
    setGateOpen(false);
  }, []);

  const signOut = useCallback(() => {
    setUserState(null);
    setBusiness(null);
    setGateOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        createBusiness,
        deleteBusiness,
        accountType: business ? 'COMPANY' : 'INDIVIDUAL',
        connected: waslaConfigured,
        gateOpen,
        gateIntent,
        openGate,
        closeGate,
        signIn,
        setUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
