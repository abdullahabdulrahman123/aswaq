import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectToWasla, waslaConfigured, type WaslaUser } from '../lib/waslaAuth';
import type { AccountType } from '../lib/pricing';

/**
 * الزبون يتصفح كزائر عادي، وتسجيل الدخول مطلوب عند إتمام الطلب فقط.
 * في كل الحالات التسجيل بيتم عبر وصلة — أسواق مش بيخزّن كلمات سر.
 */

export type AuthIntent = 'login' | 'register';

interface AuthContextValue {
  user: WaslaUser | null;
  /** نوع الحساب اللي الأسعار بتتبني عليه — الزائر بيتعامل معاملة الفرد */
  accountType: AccountType;
  /** هل وصلة متوصّلة فعلاً؟ لو لأ بنشتغل بوضع تجريبي واضح للعميل */
  connected: boolean;
  /** الطلب اللي وقفناه لحد ما يسجّل — بيفتح نافذة الدخول */
  gateOpen: boolean;
  gateIntent: AuthIntent;
  openGate: (intent?: AuthIntent) => void;
  closeGate: () => void;
  /** يوجّه لوصلة، أو يفتح جلسة تجريبية لو وصلة مش متوصّلة */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<WaslaUser | null>(loadUser);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateIntent, setGateIntent] = useState<AuthIntent>('login');

  useEffect(() => {
    if (user) localStorage.setItem('aswaq_user', JSON.stringify(user));
    else localStorage.removeItem('aswaq_user');
  }, [user]);

  const setUser = useCallback((u: WaslaUser) => {
    setUserState(u);
    setGateOpen(false);
  }, []);

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
      accountType: 'INDIVIDUAL',
      demo: true,
    });
    setGateOpen(false);
  }, []);

  const signOut = useCallback(() => {
    setUserState(null);
    setGateOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accountType: user?.accountType ?? 'INDIVIDUAL',
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
