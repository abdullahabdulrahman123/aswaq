import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectToWasla, waslaConfigured, type WaslaSession, type WaslaUser } from '../lib/waslaAuth';
import {
  ApiError,
  deleteAddress,
  fetchBusinesses,
  fetchProfile,
  patchBusinessPicture,
  patchProfilePicture,
  postAddress,
  postBusiness,
  putAddress,
  SessionExpiredError,
  type WaslaProfile,
} from '../lib/waslaApi';
import { accessToken, endSession, saveSession, SESSION_KEY, sessionUsable } from '../lib/waslaSession';
import type { AccountType } from '../lib/pricing';

/**
 * الزبون يتصفح كزائر عادي، وتسجيل الدخول مطلوب عند إتمام الطلب فقط.
 * التسجيل كله عبر وصلة — أسواق مش بيخزّن كلمات سر.
 *
 * النشاط التجاري نفسه (اسمه واختصاره وصورته وعناوينه) متسجّل في وصلة بطلب
 * العميل: البيانات الأساسية في مكان واحد لكل التطبيقات.
 *
 * صاحب الأنشطة بيختار يتعامل بإيه من المنيو اللي في صورته فوق: بحسابه الشخصي
 * (أسعار القطاعي) أو بنشاط من أنشطته (أسعار الجملة) — selectedBusiness.
 */

export type AuthIntent = 'login' | 'register';

/** عنوان النشاط — الدولة والمحافظة والمدينة من قوايم، والباقي كتابة حرة */
export interface BusinessAddress {
  /** id العنوان في وصلة. فاضي = عنوان جديد لسه متحفظش */
  id: string;
  /** اسم يميّز العنوان — "الفرع الرئيسي"، "مخزن العبور" */
  label: string;
  /**
   * نوع المكان: متجر، أو مخزن، أو الاتنين. الفورم بيلزم يختار واحد على الأقل،
   * بس العناوين اللي اتسجّلت قبل ما النوع يتضاف بترجع الاتنين false.
   */
  isStore: boolean;
  isWarehouse: boolean;
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
  /** اختصار قصير للنشاط — بيظهر كشارة جنب الاسم، ومكان اللوجو لو مفيش */
  abbreviation: string;
  /** لوجو النشاط (رابط Cloudinary). null = لسه مترفعش */
  picture: string | null;
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
  /**
   * المستخدم بيتعامل بإيه دلوقتي: نشاط من أنشطته، أو null = بحسابه الشخصي.
   * أول نشاط لو لسه مختارش، أو لو اللي اختاره اتمسح.
   */
  selectedBusiness: Business | null;
  /** null = حسابي الشخصي */
  selectBusiness: (accountId: string | null) => void;
  /** صورة الحساب في وصلة. null = شيلها. بيرمي لو الحفظ فشل */
  setUserPicture: (picture: string | null) => Promise<void>;
  /** لوجو النشاط في وصلة. null = شيله. بيرمي لو الحفظ فشل */
  setBusinessPicture: (accountId: string, picture: string | null) => Promise<void>;
  /**
   * بينفّذ نداء محتاج توكن وصلة (زي أصناف أسواق). التوكن بيتجدّد لوحده لو
   * خلص، ولو التجديد نفسه اترفض بيعلّم الجلسة كمنتهية عشان التنبيه يظهر.
   */
  withToken: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  /** الجلسة خلصت ومتجدّدتش: المعروض لسه صحيح، بس الحفظ محتاج تسجيل دخول تاني */
  sessionExpired: boolean;
  createBusiness: (input: Pick<Business, 'name' | 'abbreviation'>) => Promise<Business>;
  addAddress: (accountId: string, fields: Omit<BusinessAddress, 'id'>) => Promise<BusinessAddress>;
  updateAddress: (accountId: string, address: BusinessAddress) => Promise<void>;
  removeAddress: (accountId: string, addressId: string) => Promise<void>;
  /**
   * الأسعار بتتبني عليه: الزائر والحساب الشخصي قطاعي، واللي بيتعامل بنشاط
   * بيشوف أسعار الكميات.
   */
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

/**
 * آخر قايمة أنشطة جت من وصلة، لكل مستخدم لوحده.
 * من غيرها، أول ما الصفحة تفتح أو التوكن ينتهي القايمة بتفضى — والشركة
 * بتشوف أسعار الأفراد لحد ما تسجّل دخول تاني.
 */
const cacheKey = (sub: string) => `aswaq_businesses_cache_${sub}`;

/** المستخدم بيتعامل بإيه: id نشاط أو PERSONAL — بيفضل محفوظ بين الزيارات */
const SELECTED_PREFIX = 'aswaq_selected_business_';
const selectedKey = (sub: string) => `${SELECTED_PREFIX}${sub}`;
/** اختار حسابه الشخصي. مش شكل id نشاط، فمبيتلخبطش معاه */
const PERSONAL = 'personal';

/** بيانات وصلة الجديدة فوق المستخدم الحالي — نفس الكائن لو مفيش فرق */
function mergeProfile(prev: WaslaUser | null, profile: WaslaProfile): WaslaUser | null {
  if (!prev || prev.sub !== profile.sub) return prev;
  const picture = profile.picture ?? undefined;
  if (prev.name === profile.name && prev.email === profile.email && prev.picture === picture) return prev;
  return { ...prev, name: profile.name, email: profile.email, picture };
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaslaUser | null>(() => load<WaslaUser>(USER_KEY));
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const sub = load<WaslaUser>(USER_KEY)?.sub;
    return (sub && load<Business[]>(cacheKey(sub))) || [];
  });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(() => {
    const sub = load<WaslaUser>(USER_KEY)?.sub;
    return sub ? load<string>(selectedKey(sub)) : null;
  });
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  // التحميل مربوط بالمستخدم نفسه مش بالكائن: تغيير صورته مبيعيدش تحميل أنشطته
  const sub = user?.sub;
  const demo = Boolean(user?.demo);

  // الجلسة نفسها مش هنا: waslaSession.ts بيكتبها في التخزين على طول (شوف السبب هناك)
  useEffect(() => save(USER_KEY, user), [user]);

  /*
   * تسجيل الدخول ممكن يخلص في شباك غير اللي المستخدم فاتحه: تاب تاني، أو —
   * في أسواق المتثبّت كتطبيق على أندرويد — الشباك الصغير اللي بيفتح فوق
   * التطبيق لأي رابط برّه نطاقه (زي وصلة). التخزين واحد بين الاتنين، فبنقرا
   * المستخدم تاني أول ما يتغيّر أو المستخدم يرجع للشباك ده. من غير كده التطبيق
   * كان بيفضل عارض إنه مش مسجّل لحد ما يتقفل ويتفتح.
   *
   * بنرجّع نفس الكائن لو مفيش تغيير فعلي، عشان منعيدش تحميل الأنشطة على الفاضي.
   */
  useEffect(() => {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const sync = () => {
      const nextUser = load<WaslaUser>(USER_KEY);
      setUser((prev) => (same(prev, nextUser) ? prev : nextUser));
      setSelectedBusinessId(nextUser ? load<string>(selectedKey(nextUser.sub)) : null);
      // شباك تاني سجّل دخول: التنبيه هنا ملوش لازمة
      if (sessionUsable()) setSessionExpired(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === USER_KEY ||
        event.key === SESSION_KEY ||
        event.key.startsWith(SELECTED_PREFIX)
      ) {
        sync();
      }
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

  /**
   * كل نداء بتوكن بيعدّي من هنا: بياخد توكن صالح (وبيجدّده لو خلص)، ولو
   * التجديد نفسه اترفض بيرفع sessionExpired عشان الصفحة تعرض "سجّل دخول تاني".
   */
  const withToken = useCallback(
    async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
      if (demo) {
        throw new ApiError(0, 'الحفظ محتاج تسجيل دخول حقيقي بوصلة — النسخة دي شغالة بوضع تجريبي.');
      }
      try {
        const token = await accessToken();
        try {
          return await call(token);
        } catch (err) {
          // السيرفر رفض توكن ساعته لسه مخلصتش: نجدّد مرة ونعيد.
          // الـ401 بيرجع قبل أي حفظ، فالإعادة مبتكررش حاجة.
          if (!(err instanceof SessionExpiredError)) throw err;
          return await call(await accessToken(token));
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) setSessionExpired(true);
        throw err;
      }
    },
    [demo],
  );

  // القايمة من وصلة مع كل مستخدم أو دخول جديد — مش مع كل تجديد للتوكن
  useEffect(() => {
    if (!sub || demo) {
      setBusinesses([]);
      setBusinessesLoading(false);
      return;
    }
    setBusinesses(load<Business[]>(cacheKey(sub)) ?? []);
    setSelectedBusinessId(load<string>(selectedKey(sub)));
    setBusinessesError('');

    // الجلسة خلصت ومتجدّدتش: المعروض من الكاش لحد ما يسجّل دخول تاني
    if (sessionExpired) {
      setBusinessesLoading(false);
      return;
    }

    let cancelled = false;
    setBusinessesLoading(true);
    withToken(fetchBusinesses)
      .then((list) => {
        if (cancelled) return;
        setBusinesses(list);
        save(cacheKey(sub), list);
      })
      .catch((err: unknown) => {
        // انتهاء الجلسة بيظهر لوحده كتنبيه — withToken رفع sessionExpired
        if (cancelled || err instanceof SessionExpiredError) return;
        setBusinessesError(err instanceof Error ? err.message : 'مقدرناش نجيب أنشطتك من وصلة.');
      })
      .finally(() => {
        if (!cancelled) setBusinessesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sub, demo, sessionExpired, withToken]);

  /*
   * الاسم والصورة ممكن يتغيّروا بعد الدخول (صورة اترفعت من جهاز تاني مثلاً)،
   * فبنسأل وصلة عنهم مع كل فتحة. لو مردتش، اللي من وقت الدخول يفضل معروض.
   */
  useEffect(() => {
    if (!sub || demo || sessionExpired) return;
    let cancelled = false;
    withToken(fetchProfile)
      .then((profile) => {
        if (!cancelled) setUser((prev) => mergeProfile(prev, profile));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sub, demo, sessionExpired, withToken]);

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

  const selectBusiness = useCallback(
    (accountId: string | null) => {
      const value = accountId ?? PERSONAL;
      setSelectedBusinessId(value);
      if (user) save(selectedKey(user.sub), value);
    },
    [user],
  );

  const setUserPicture = useCallback(
    async (picture: string | null) => {
      const profile = await withToken((token) => patchProfilePicture(token, picture));
      setUser((prev) => mergeProfile(prev, profile));
    },
    [withToken],
  );

  const setBusinessPicture = useCallback(
    async (accountId: string, picture: string | null) => {
      const saved = await withToken((token) => patchBusinessPicture(token, accountId, picture));
      commit((prev) => prev.map((b) => (b.accountId === accountId ? { ...b, picture: saved.picture } : b)));
    },
    [withToken, commit],
  );

  const createBusiness = useCallback(
    async (input: Pick<Business, 'name' | 'abbreviation'>) => {
      const created = await withToken((token) => postBusiness(token, input));
      commit((prev) => [...prev, created]);
      // اللي لسه عامل نشاط غالباً عايز يشتغل بيه
      selectBusiness(created.accountId);
      return created;
    },
    [withToken, commit, selectBusiness],
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
    saveSession(s);
    setUser(u);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(() => {
    // الجهاز ممكن يكون مشترك — بيانات الأنشطة متفضلش بعد الخروج
    if (user) save(cacheKey(user.sub), null);
    endSession();
    setUser(null);
    setBusinesses([]);
    setSessionExpired(false);
  }, [user]);

  /*
   * PERSONAL = حسابه الشخصي. غير كده اللي اتختار لو لسه موجود، وإلا أول نشاط —
   * فمفيش حالة "مختار حاجة مش موجودة". اللي معندوش أنشطة شخصي على طول.
   */
  const selectedBusiness =
    selectedBusinessId === PERSONAL
      ? null
      : (businesses.find((b) => b.accountId === selectedBusinessId) ?? businesses[0] ?? null);

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses,
        businessesLoading,
        businessesError,
        selectedBusiness,
        selectBusiness,
        setUserPicture,
        setBusinessPicture,
        withToken,
        sessionExpired,
        createBusiness,
        addAddress,
        updateAddress,
        removeAddress,
        accountType: selectedBusiness ? 'COMPANY' : 'INDIVIDUAL',
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
