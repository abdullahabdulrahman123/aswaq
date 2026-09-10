import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectToWasla, waslaConfigured, type WaslaUser } from '../lib/waslaAuth';
import type { AccountType } from '../lib/pricing';

/**
 * الزبون يتصفح كزائر عادي، وتسجيل الدخول مطلوب عند إتمام الطلب فقط.
 * التسجيل كله عبر وصلة — أسواق مش بيخزّن كلمات سر.
 *
 * وصلة بتقول مين المستخدم وبس. الفرق بين الفرد والشركة بيتحدد هنا في
 * أسواق: اللي عنده نشاط تجاري مسجّل بيبقى شركة، والباقي أفراد.
 * ده الصح لأن النشاط التجاري حاجة تخص أسواق مش منصة الهوية.
 */

export type AuthIntent = 'login' | 'register';

/**
 * نشاط تجاري مسجّل على أسواق — وجود واحد على الأقل بيحوّل الحساب لحساب شركة.
 * المستخدم ممكن يكون عنده أكتر من نشاط.
 */
/** عنوان النشاط — الدولة والمحافظة والمدينة من قوايم، والباقي كتابة حرة */
export interface BusinessAddress {
  /** بيتولّد وقت الإضافة — عشان التعديل والحذف يمسكوا العنوان الصح مهما اتغيّر ترتيبهم */
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

export interface Business {
  id: string;
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
  /** أنشطة المستخدم الحالي التجارية — فاضية لو معملش ولا واحد */
  businesses: Business[];
  createBusiness: (b: Pick<Business, 'name' | 'abbreviation'>) => Business;
  deleteBusiness: (id: string) => void;
  /** بترجّع العنوان بالـid اللي اتولّد له */
  addAddress: (businessId: string, address: Omit<BusinessAddress, 'id'>) => BusinessAddress;
  updateAddress: (businessId: string, address: BusinessAddress) => void;
  removeAddress: (businessId: string, addressId: string) => void;
  /** الأسعار بتتبني عليه — الزائر والفرد زي بعض، الشركة بتشوف أسعار الكميات */
  accountType: AccountType;
  /** هل وصلة متوصّلة فعلاً؟ لو لأ بنشتغل بوضع تجريبي واضح للعميل */
  connected: boolean;
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

/** مفتاح لكل مستخدم — عشان أنشطة حد ما تظهرش لحد تاني على نفس الجهاز */
const businessKey = (sub: string) => `aswaq_businesses_${sub}`;

/**
 * الشكل المحفوظ على الأجهزة. النشاط كان بياخد عنوان واحد اسمه address، وبقى
 * بياخد قايمة، فبنحوّل القديم بدل ما يضيع على اللي مسجّل نشاطه قبل التغيير.
 */
type StoredBusiness = Omit<Business, 'addresses'> & {
  addresses?: BusinessAddress[];
  address?: Omit<BusinessAddress, 'id'> & { id?: string };
};

function normalize(stored: StoredBusiness[]): Business[] {
  return stored.map(({ address, addresses, ...rest }) => ({
    ...rest,
    addresses:
      addresses ??
      (address ? [{ ...address, id: address.id || crypto.randomUUID() }] : []),
  }));
}

function loadBusinesses(sub: string | undefined): Business[] {
  if (!sub) return [];
  try {
    const raw = localStorage.getItem(businessKey(sub));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? normalize(parsed as StoredBusiness[]) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<WaslaUser | null>(loadUser);
  const [businesses, setBusinesses] = useState<Business[]>(() => loadBusinesses(loadUser()?.sub));

  useEffect(() => {
    if (user) localStorage.setItem('aswaq_user', JSON.stringify(user));
    else localStorage.removeItem('aswaq_user');
    // الأنشطة بتتقرا من جديد مع كل تغيير مستخدم
    setBusinesses(loadBusinesses(user?.sub));
  }, [user]);

  const setUser = useCallback((u: WaslaUser) => {
    setUserState(u);
  }, []);

  /** كل تعديل بيتكتب على المتصفح فوراً — مفيش سيرفر بيحفظ الأنشطة لسه */
  const commit = useCallback(
    (update: (prev: Business[]) => Business[]) => {
      if (!user) return;
      setBusinesses((prev) => {
        const next = update(prev);
        localStorage.setItem(businessKey(user.sub), JSON.stringify(next));
        return next;
      });
    },
    [user],
  );

  const createBusiness = useCallback(
    (b: Pick<Business, 'name' | 'abbreviation'>) => {
      if (!user) throw new Error('لازم تسجّل دخول الأول');
      const record: Business = {
        ...b,
        // العناوين بتتضاف بعدين من صفحة النشاط — التسجيل نفسه اسم واختصار وبس
        addresses: [],
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      commit((prev) => [...prev, record]);
      return record;
    },
    [user, commit],
  );

  const deleteBusiness = useCallback(
    (id: string) => commit((prev) => prev.filter((b) => b.id !== id)),
    [commit],
  );

  /** تعديل عناوين نشاط واحد من غير ما نلمس الباقي */
  const mapAddresses = useCallback(
    (businessId: string, update: (list: BusinessAddress[]) => BusinessAddress[]) =>
      commit((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, addresses: update(b.addresses) } : b)),
      ),
    [commit],
  );

  const addAddress = useCallback(
    (businessId: string, address: Omit<BusinessAddress, 'id'>) => {
      const record: BusinessAddress = { ...address, id: crypto.randomUUID() };
      mapAddresses(businessId, (list) => [...list, record]);
      return record;
    },
    [mapAddresses],
  );

  const updateAddress = useCallback(
    (businessId: string, address: BusinessAddress) =>
      mapAddresses(businessId, (list) => list.map((a) => (a.id === address.id ? address : a))),
    [mapAddresses],
  );

  const removeAddress = useCallback(
    (businessId: string, addressId: string) =>
      mapAddresses(businessId, (list) => list.filter((a) => a.id !== addressId)),
    [mapAddresses],
  );

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
  }, []);

  const signOut = useCallback(() => {
    setUserState(null);
    setBusinesses([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses,
        createBusiness,
        deleteBusiness,
        addAddress,
        updateAddress,
        removeAddress,
        accountType: businesses.length > 0 ? 'COMPANY' : 'INDIVIDUAL',
        connected: waslaConfigured,
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
