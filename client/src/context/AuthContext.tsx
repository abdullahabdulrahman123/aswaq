import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectToWasla, waslaConfigured, type WaslaSession, type WaslaUser } from '../lib/waslaAuth';
import {
  ApiError,
  deleteAddress,
  fetchBusinesses,
  postAddress,
  postBusiness,
  putAddress,
  SessionExpiredError,
} from '../lib/waslaApi';
import type { AccountType } from '../lib/pricing';

/**
 * الزبون يتصفح كزائر عادي، وتسجيل الدخول مطلوب عند إتمام الطلب فقط.
 * التسجيل كله عبر وصلة — أسواق مش بيخزّن كلمات سر.
 *
 * النشاط التجاري نفسه (اسمه واختصاره وعناوينه) متسجّل في وصلة بطلب العميل:
 * البيانات الأساسية في مكان واحد لكل التطبيقات. أسواق بياخد منه قرار واحد:
 * اللي عنده نشاط يبقى شركة، والباقي أفراد.
 */

export type AuthIntent = 'login' | 'register';

/** عنوان النشاط — الدولة والمحافظة والمدينة من قوايم، والباقي كتابة حرة */
export interface BusinessAddress {
  /** id العنوان في وصلة. فاضي = عنوان جديد لسه متحفظش */
  id: string;
  /** اسم يميّز العنوان — "الفرع الرئيسي"، "المخزن" */
  label: string;
  /** وصف حر يساعد في الوصول */
  description: string;
  country: string;
  governorate: string;
  city: string;
  district: string;
  street: string;
  /** علامة مميزة تسهّل الوصول — "جنب مسجد النور" مثلاً */
  landmark: string;
  /** موقع الدبوس على الخريطة — بيلزم للتوصيل و"الشركات القريبة مني" بعدين */
  lat: number;
  lng: number;
}

/**
 * نشاط تجاري — وجود واحد على الأقل بيحوّل الحساب لحساب شركة.
 * المستخدم ممكن يكون عنده أكتر من نشاط.
 */
export interface Business {
  /**
   * id حساب النشاط في وصلة. ده المعرّف الموحّد حسب السكيمة: العناوين،
   * والمحلات والأصناف في أسواق، كلها بتتربط بيه.
   */
  accountId: string;
  name: string;
  /** اختصار قصير للنشاط — بيظهر كشارة جنب الاسم */
  abbreviation: string;
  /**
   * النشاط ممكن يكون له أكتر من مكان (فرع، مخزن، مكتب)، وممكن يتسجّل من
   * غير عنوان خالص ويتضاف بعدين من صفحة النشاط.
   */
  addresses: BusinessAddress[];
  createdAt: string;
}

interface AuthContextValue {
  user: WaslaUser | null;
  /** أنشطة المستخدم الحالي — آخر نسخة معروفة لحد ما وصلة ترد */
  businesses: Business[];
  /** بنستنى رد وصلة على قايمة الأنشطة */
  businessesLoading: boolean;
  /** تحميل القايمة فشل. أخطاء الحفظ مش هنا — بتترمي للي نادى */
  businessesError: string;
  /** توكن وصلة انتهى: المعروض لسه صحيح، بس الحفظ محتاج تسجيل دخول تاني */
  sessionExpired: boolean;
  createBusiness: (input: Pick<Business, 'name' | 'abbreviation'>) => Promise<Business>;
  addAddress: (accountId: string, fields: Omit<BusinessAddress, 'id'>) => Promise<BusinessAddress>;
  updateAddress: (accountId: string, address: BusinessAddress) => Promise<void>;
  removeAddress: (accountId: string, addressId: string) => Promise<void>;
  /** الأسعار بتتبني عليه — الزائر والفرد زي بعض، الشركة بتشوف أسعار الكميات */
  accountType: AccountType;
  /** هل وصلة متوصّلة فعلاً؟ لو لأ بنشتغل بوضع تجريبي واضح للعميل */
  connected: boolean;
  signIn: (intent: AuthIntent) => Promise<void>;
  /** المستخدم رجع من وصلة بهويته وتوكن الوصول */
  completeSignIn: (user: WaslaUser, session: WaslaSession) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'aswaq_user';
const SESSION_KEY = 'aswaq_session';

/**
 * آخر قايمة أنشطة جت من وصلة، لكل مستخدم لوحده.
 * من غيرها، أول ما الصفحة تفتح أو التوكن ينتهي القايمة بتفضى — والشركة
 * بتشوف أسعار الأفراد لحد ما تسجّل دخول تاني.
 */
const cacheKey = (sub: string) => `aswaq_businesses_cache_${sub}`;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // المتصفح قافل التخزين — الموقع يفضل شغال، بس من غير تذكّر
  }
}

const isLive = (session: WaslaSession | null): session is WaslaSession =>
  Boolean(session && session.expiresAt > Date.now());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaslaUser | null>(() => load<WaslaUser>(USER_KEY));
  const [session, setSession] = useState<WaslaSession | null>(() => load<WaslaSession>(SESSION_KEY));
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const sub = load<WaslaUser>(USER_KEY)?.sub;
    return (sub && load<Business[]>(cacheKey(sub))) || [];
  });
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => save(USER_KEY, user), [user]);
  useEffect(() => save(SESSION_KEY, session), [session]);

  /*
   * تسجيل الدخول ممكن يخلص في شباك غير اللي المستخدم فاتحه: تاب تاني، أو —
   * في أسواق المتثبّت كتطبيق على أندرويد — الشباك الصغير اللي بيفتح فوق
   * التطبيق لأي رابط برّه نطاقه (زي وصلة). التخزين واحد بين الاتنين، فبنقرا
   * الجلسة تاني أول ما تتغيّر أو المستخدم يرجع للشباك ده. من غير كده التطبيق
   * كان بيفضل عارض إنه مش مسجّل لحد ما يتقفل ويتفتح.
   *
   * بنرجّع نفس الكائن لو مفيش تغيير فعلي، عشان منعيدش تحميل الأنشطة على الفاضي.
   */
  useEffect(() => {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const sync = () => {
      const nextUser = load<WaslaUser>(USER_KEY);
      const nextSession = load<WaslaSession>(SESSION_KEY);
      setUser((prev) => (same(prev, nextUser) ? prev : nextUser));
      setSession((prev) => (same(prev, nextSession) ? prev : nextSession));
      if (isLive(nextSession)) setSessionExpired(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === USER_KEY || event.key === SESSION_KEY) sync();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // القايمة من وصلة مع كل مستخدم أو توكن جديد
  useEffect(() => {
    if (!user || user.demo) {
      setBusinesses([]);
      return;
    }
    setBusinesses(load<Business[]>(cacheKey(user.sub)) ?? []);
    setBusinessesError('');

    if (!isLive(session)) {
      setSessionExpired(true);
      return;
    }

    let cancelled = false;
    setBusinessesLoading(true);
    fetchBusinesses(session.accessToken)
      .then((list) => {
        if (cancelled) return;
        setBusinesses(list);
        save(cacheKey(user.sub), list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) setSessionExpired(true);
        else setBusinessesError(err instanceof Error ? err.message : 'مقدرناش نجيب أنشطتك من وصلة.');
      })
      .finally(() => {
        if (!cancelled) setBusinessesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, session]);

  /**
   * كل عملية حفظ بتعدّي من هنا: بتاخد التوكن، ولو وصلة قالت إنه انتهى
   * بترفع علامة sessionExpired عشان الصفحة تعرض "سجّل دخول تاني".
   */
  const withToken = useCallback(
    async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
      if (user?.demo) {
        throw new ApiError(0, 'الأنشطة التجارية محتاجة تسجيل دخول حقيقي بوصلة — النسخة دي شغالة بوضع تجريبي.');
      }
      try {
        if (!isLive(session)) throw new SessionExpiredError();
        return await call(session.accessToken);
      } catch (err) {
        if (err instanceof SessionExpiredError) setSessionExpired(true);
        throw err;
      }
    },
    [user, session],
  );

  /** بنحدّث الحالة والنسخة المحفوظة مع بعض */
  const commit = useCallback(
    (update: (prev: Business[]) => Business[]) => {
      setBusinesses((prev) => {
        const next = update(prev);
        if (user) save(cacheKey(user.sub), next);
        return next;
      });
    },
    [user],
  );

  const createBusiness = useCallback(
    async (input: Pick<Business, 'name' | 'abbreviation'>) => {
      const created = await withToken((token) => postBusiness(token, input));
      commit((prev) => [...prev, created]);
      return created;
    },
    [withToken, commit],
  );

  /** تعديل عناوين نشاط واحد من غير ما نلمس الباقي */
  const mapAddresses = useCallback(
    (accountId: string, update: (list: BusinessAddress[]) => BusinessAddress[]) =>
      commit((prev) =>
        prev.map((b) => (b.accountId === accountId ? { ...b, addresses: update(b.addresses) } : b)),
      ),
    [commit],
  );

  const addAddress = useCallback(
    async (accountId: string, fields: Omit<BusinessAddress, 'id'>) => {
      const created = await withToken((token) => postAddress(token, accountId, fields));
      mapAddresses(accountId, (list) => [...list, created]);
      return created;
    },
    [withToken, mapAddresses],
  );

  const updateAddress = useCallback(
    async (accountId: string, address: BusinessAddress) => {
      const saved = await withToken((token) => putAddress(token, accountId, address));
      mapAddresses(accountId, (list) => list.map((a) => (a.id === saved.id ? saved : a)));
    },
    [withToken, mapAddresses],
  );

  const removeAddress = useCallback(
    async (accountId: string, addressId: string) => {
      await withToken((token) => deleteAddress(token, accountId, addressId));
      mapAddresses(accountId, (list) => list.filter((a) => a.id !== addressId));
    },
    [withToken, mapAddresses],
  );

  const signIn = useCallback(async (intent: AuthIntent) => {
    if (waslaConfigured) {
      await redirectToWasla(window.location.pathname + window.location.search, intent);
      return;
    }
    // وصلة مش متوصّلة — جلسة تجريبية معلّمة بوضوح
    setUser({
      sub: 'demo-user',
      name: intent === 'register' ? 'حساب جديد (تجريبي)' : 'مستخدم تجريبي',
      email: 'demo@aswaq.local',
      demo: true,
    });
  }, []);

  const completeSignIn = useCallback((u: WaslaUser, s: WaslaSession) => {
    setUser(u);
    setSession(s);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(() => {
    // الجهاز ممكن يكون مشترك — بيانات الأنشطة متفضلش بعد الخروج
    if (user) save(cacheKey(user.sub), null);
    setUser(null);
    setSession(null);
    setBusinesses([]);
    setSessionExpired(false);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses,
        businessesLoading,
        businessesError,
        sessionExpired,
        createBusiness,
        addAddress,
        updateAddress,
        removeAddress,
        accountType: businesses.length > 0 ? 'COMPANY' : 'INDIVIDUAL',
        connected: waslaConfigured,
        signIn,
        completeSignIn,
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
