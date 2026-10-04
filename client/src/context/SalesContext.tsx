import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, type Business } from './AuthContext';
import type { ReceivingMethod } from '../lib/itemUnits';
import type { Customer } from '../lib/waslaApi';

/**
 * «مبيعات» بطلب العميل: فاتورة بيحررها البائع لمشتري، على نفس المعرض. البيعة
 * بتبدأ من «مبيعات» في المنيو — رأس الفاتورة بيتفتح فوق أصناف المتجر نفسه
 * (SalesPanel، مكالمة ١ أكتوبر)، وبعدها:
 *   - بتفتح على المتجر اللي البائع بيبيع منه (بيختاره في النافذة)، والرئيسية
 *     بتعرض متاجر النشاط البائع بس
 *   - الأسعار أسعار المحل حسب المشتري: شركة = جملة، مستخدم = قطاعي
 *   - اسم المشتري على شمال السلة، والسلة بتاعته هو مش بتاعة المستخدم
 *
 * المشتري حساب في وصلة، بطلب العميل («اليوزر هو العميل والبيزنس هو العميل»):
 * مسجّل، أو واحد من حسابين ثابتين لغير المسجلين — والاسم الأدبي والرقم
 * بيتكتبوا في الفاتورة نفسها.
 *
 * الأطراف: المشتري، والبائع (النشاط، واللي بيبيع — دلوقتي المستخدم نفسه)،
 * والمحرّر (المستخدم نفسه). مندوبين البيع بعدين.
 *
 * البيعة بتفضل محفوظة بعد ما البائع يخرج منها — العميل عايزها لأسباب تسويقية
 * (الهلال يقدر يكلّم اللي ما كمّلش). «الشغالة» (active) هي اللي البائع جوّاها
 * دلوقتي: بتقفل أول ما يخرج من الأوردر، وبترجع لما يفتحه من السلة.
 *
 * على الجهاز بس لحد ما الطلبات والفواتير تتعمل في السيرفر.
 */
export interface SalesSession {
  /** بيفرّق سلة البيعة دي عن غيرها */
  id: string;
  /** النشاط البائع */
  accountId: string;
  businessName: string;
  /** المشتري في وصلة */
  buyer: Customer;
  /** واحد من حسابين غير المسجلين — مالوش صورة، واسمه الأدبي هو اللي بيتكتب */
  walkIn: boolean;
  /** الاسم الأدبي — «الحاج فلان». فاضي = اسم الحساب */
  buyerName: string;
  phone: string;
  /** البائع — دلوقتي المستخدم اللي فاتح */
  sellerName: string;
  method: ReceivingMethod;
  /** عنوان التوصيل كتابة — «جنب الجامع الكبير». فاضي في الاستلام */
  address: string;
  /** المتجر اللي البائع بيبيع منه — البيعات اللي اتحفظت قبل ٢٨ سبتمبر من غيره */
  shopId?: string;
}

export type SalesDraft = Omit<SalesSession, 'id'>;

/** الاسم اللي بيظهر للمشتري: الأدبي، وإلا اسم الحساب */
export const buyerLabel = (s: SalesSession) => s.buyerName.trim() || s.buyer.name;

interface Sales {
  /** البيعة اللي البائع جوّاها دلوقتي، أو null */
  session: SalesSession | null;
  /** كل البيعات المحفوظة على الجهاز */
  sessions: SalesSession[];
  /** بيعة جديدة وبتبقى هي الشغالة */
  start: (draft: SalesDraft) => void;
  /** تعديل بيانات البيعة الشغالة من غير ما سلتها تتمسح */
  update: (draft: SalesDraft) => void;
  /** يرجع لبيعة محفوظة */
  resume: (id: string) => void;
  /** بيعة جاية من أوردر على السيرفر (جهاز تاني مثلاً) — بتتضاف لو مش موجودة وبتبقى الشغالة */
  restore: (session: SalesSession) => void;
  /** يخرج من البيعة الشغالة — بتفضل محفوظة */
  leave: () => void;
  /** يمسح بيعة وسلتها */
  drop: (id: string) => void;
  /**
   * رأس الفاتورة مفتوح (الأكورديون في صفحة المتجر) — لنشاط، ومعاه البيعة اللي
   * بتتعدّل لو فيه. FollowSalesPanel بيودّي على متجر النشاط لو الصفحة مش عليه.
   */
  dialog: { business: Business; editing: SalesSession | null } | null;
  openDialog: (business: Business, editing?: SalesSession | null) => void;
  closeDialog: () => void;
  /**
   * الفاتورة اللي اتأكدت من صفحة المتجر وفاضلة قدام البائع (مكالمة ٢ أكتوبر:
   * «تأكيد» ميوديش صفحة تانية — الأكورديون بيعرضها بمرحلتها وزرار اللي بعدها).
   * للبيعة الشغالة بس. null = لسه بيبيع (مسودة)
   */
  confirmedOrderId: string | null;
  markConfirmed: (orderId: string) => void;
}

const KEY = 'aswaq_sales_sessions';
const ACTIVE_KEY = 'aswaq_sales_active';
/** الفاتورة المؤكدة لكل بيعة: id البيعة → id الأوردر */
const CONFIRMED_KEY = 'aswaq_sales_confirmed';
/** آخر متجر البائع باع منه في كل نشاط — النافذة بتفتح عليه، عشان عميل الشباك في نفس المتجر */
const lastShopKey = (accountId: string) => `aswaq_sales_shop_${accountId}`;
export const lastSalesShop = (accountId: string) => read<string | null>(lastShopKey(accountId), null);
export const rememberSalesShop = (accountId: string, shopId: string) => write(lastShopKey(accountId), shopId);

/** سلة كل بيعة على مفتاح لوحده — StoreCartContext بيقراه */
export const salesCartKey = (session: Pick<SalesSession, 'id'>) => `aswaq_sales_cart_${session.id}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // الجهاز رافض يحفظ — البيعة تفضل في الصفحة وبس
  }
}

/** البيعات اللي اتحفظت قبل ما المشتري يبقى حساب في وصلة مبتتقريش */
function readSessions(): SalesSession[] {
  const list = read<unknown>(KEY, []);
  return Array.isArray(list)
    ? list.filter((s): s is SalesSession => Boolean(s) && typeof s.id === 'string' && typeof s.buyer?.accountId === 'string')
    : [];
}

const SalesContext = createContext<Sales | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SalesSession[]>(readSessions);
  const [activeId, setActiveId] = useState<string | null>(() => read<string | null>(ACTIVE_KEY, null));
  const [dialog, setDialog] = useState<Sales['dialog']>(null);
  const [confirmed, setConfirmed] = useState<Record<string, string>>(() => read<Record<string, string>>(CONFIRMED_KEY, {}));

  useEffect(() => write(KEY, sessions), [sessions]);
  useEffect(() => write(ACTIVE_KEY, activeId), [activeId]);
  useEffect(() => write(CONFIRMED_KEY, Object.keys(confirmed).length ? confirmed : null), [confirmed]);

  const start = useCallback((draft: SalesDraft) => {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setSessions((prev) => [...prev, { ...draft, id }]);
    setActiveId(id);
  }, []);

  const update = useCallback(
    (draft: SalesDraft) => setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...draft, id: s.id } : s))),
    [activeId],
  );

  const drop = useCallback((id: string) => {
    write(salesCartKey({ id }), null);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
    setConfirmed((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _gone, ...rest } = prev;
      return rest;
    });
  }, []);

  // الخروج من الحساب بيمسح البيعات — الجهاز ممكن يكون مشترك
  useEffect(() => {
    if (user || sessions.length === 0) return;
    for (const s of sessions) write(salesCartKey(s), null);
    setSessions([]);
    setActiveId(null);
    setConfirmed({});
  }, [user, sessions]);

  const session = sessions.find((s) => s.id === activeId) ?? null;

  const value = useMemo<Sales>(
    () => ({
      session,
      sessions,
      start,
      update,
      resume: setActiveId,
      restore: (restored) => {
        setSessions((prev) => (prev.some((s) => s.id === restored.id) ? prev : [...prev, restored]));
        setActiveId(restored.id);
      },
      leave: () => setActiveId(null),
      drop,
      dialog,
      openDialog: (business, editing = null) => setDialog({ business, editing }),
      closeDialog: () => setDialog(null),
      confirmedOrderId: session ? (confirmed[session.id] ?? null) : null,
      markConfirmed: (orderId) => {
        if (session) setConfirmed((prev) => ({ ...prev, [session.id]: orderId }));
      },
    }),
    [session, sessions, start, update, drop, dialog, confirmed],
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): Sales {
  const sales = useContext(SalesContext);
  if (!sales) throw new Error('useSales must be used within SalesProvider');
  return sales;
}
