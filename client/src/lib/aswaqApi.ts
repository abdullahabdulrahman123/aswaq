import type { PriceField } from './itemUnits';
import { ApiError, SessionExpiredError } from './waslaApi';

/**
 * سيرفر أسواق — المحلات والأصناف. (بيانات النشاط الأساسية في وصلة، شوف waslaApi.)
 *
 * التوكن هو نفسه توكن وصلة: أسواق بيسأل وصلة بيه عن المستخدم وأنشطته،
 * فمفيش تسجيل دخول تاني ولا توكن تاني.
 */
const ORIGIN = (import.meta.env.VITE_ASWAQ_API_ORIGIN ?? '').trim().replace(/\/+$/, '');

/** سيرفر الأصناف متوصّل؟ لو لأ الصفحات بتقول كده بدل ما ترمي خطأ */
export const aswaqApiConfigured = Boolean(ORIGIN);

/** وحدة بيع للصنف. الأسعار بالقرش، وnull = لسه متحددش */
export interface ItemUnit {
  name: string;
  /** كام من أصغر وحدة جوه الوحدة دي (عدد صحيح) — لازم تكون فيه وحدة بـ1 */
  unitContent: number;
  /** متوسط تكلفة الوحدة بالقرش — بيتكتب بإيد */
  avgCost: number | null;
  rate: number | null;
  /** وزن الوحدة الواحدة بالجرام */
  weight: number | null;
  /** حجم الوحدة الواحدة بالسنتيمتر المكعب */
  volume: number | null;
  onSWP: number | null;
  onSRP: number | null;
  onLWP: number | null;
  onLRP: number | null;
}

export interface Item {
  id: string;
  accountId: string;
  shopId: string | null;
  name: string;
  picture: string | null;
  /** متوسط التكلفة — بيتحسب من المشتريات، محدش بيكتبه */
  avgCost: number;
  rate: number;
  isOwner: boolean;
  units: ItemUnit[];
}

export interface NewItem {
  name: string;
  picture: string | null;
  units: ItemUnit[];
}

/**
 * التعديل بيبعت الصنف كله، والسيرفر بيرجّع الناقص لقيمته الافتراضية —
 * عشان كده بنبعت rate وisOwner زي ما هما بدل ما يترجّعوا للأول.
 */
export interface EditItem extends NewItem {
  rate: number;
  isOwner: boolean;
}

const MESSAGES: Record<number, string> = {
  400: 'البيانات فيها حاجة مش مظبوطة. راجعها وجرّب تاني.',
  404: 'مش لاقيين النشاط ده — يمكن يكون اتحذف.',
  409: 'فيه صنف بنفس الاسم في النشاط ده.',
  503: 'وصلة مش رادّة دلوقتي. جرّب كمان شوية.',
};

/** token = null للمعرض — الزائر بيشوف المتاجر وأصنافها من غير تسجيل دخول */
async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  if (!ORIGIN) throw new ApiError(0, 'سيرفر الأصناف مش متوصّل بالنسخة دي.');

  let res: Response;
  try {
    res = await fetch(`${ORIGIN}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'مقدرناش نوصل لسيرفر أسواق. اتأكد من النت وجرّب تاني.');
  }

  if (res.status === 401) throw new SessionExpiredError();
  if (!res.ok) {
    throw new ApiError(res.status, MESSAGES[res.status] ?? 'حصلت مشكلة في السيرفر. جرّب كمان شوية.');
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const itemsPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}/items`;

export async function fetchItems(token: string, accountId: string): Promise<Item[]> {
  const { items } = await request<{ items: Item[] }>(itemsPath(accountId), token);
  return items;
}

export async function fetchItem(token: string, accountId: string, itemId: string): Promise<Item> {
  const { item } = await request<{ item: Item }>(`${itemsPath(accountId)}/${encodeURIComponent(itemId)}`, token);
  return item;
}

/** 409 = فيه صنف بنفس الاسم عند النشاط ده */
export async function postItem(token: string, accountId: string, input: NewItem): Promise<Item> {
  const { item } = await request<{ item: Item }>(itemsPath(accountId), token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return item;
}

export async function putItem(
  token: string,
  accountId: string,
  itemId: string,
  input: EditItem,
): Promise<Item> {
  const { item } = await request<{ item: Item }>(`${itemsPath(accountId)}/${encodeURIComponent(itemId)}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return item;
}

export async function deleteItem(token: string, accountId: string, itemId: string): Promise<void> {
  await request<void>(`${itemsPath(accountId)}/${encodeURIComponent(itemId)}`, token, { method: 'DELETE' });
}

/**
 * أصناف المتاجر. المتجر هو مقر من مقرات النشاط معلّم عليه «متجر» في وصلة،
 * وصنف المتجر نسخة مستقلة من صنف النشاط — بطلب العميل، عشان السعر ومعدل
 * البيع بيختلفوا من فرع لفرع.
 */
const storePath = (accountId: string, shopId: string) =>
  `/api/businesses/${encodeURIComponent(accountId)}/shops/${encodeURIComponent(shopId)}/items`;

export async function fetchStoreItems(token: string, accountId: string, shopId: string): Promise<Item[]> {
  const { items } = await request<{ items: Item[] }>(storePath(accountId, shopId), token);
  return items;
}

/** أصناف النشاط اللي لسه مضافتش للمتجر ده — دي اللي بتتحط في كومبو الإضافة */
export async function fetchItemsForStore(token: string, accountId: string, shopId: string): Promise<Item[]> {
  const { items } = await request<{ items: Item[] }>(`${storePath(accountId, shopId)}/available`, token);
  return items;
}

/** 409 = الصنف ده متضاف للمتجر ده قبل كده */
export async function postStoreItem(
  token: string,
  accountId: string,
  shopId: string,
  itemId: string,
): Promise<Item> {
  const { item } = await request<{ item: Item }>(storePath(accountId, shopId), token, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
  return item;
}

/** نطاق توصيل متجر — المعرض بياخد ده بس عن كل المتاجر */
export interface DeliveryRadius {
  shopId: string;
  deliveryRadiusKm: number | null;
}

/**
 * الحد الأدنى للأوردر بالقرش لكل شريحة سعر — المفتاح هو نفسه مفتاح السعر،
 * فالواجهة بتاخد الحد بنفس المفتاح اللي بتعرض بيه السعر. null = مفيش حد أدنى.
 */
export type Minimums = Record<PriceField, number | null>;

/**
 * إعدادات المتجر في أسواق — بطلب العميل «إعدادات خاصة بالمتاجر»: نطاق التوصيل
 * بالكيلو (null = مبيوصّلش)، والحد الأدنى للأوردر بشرايحه. المتجر اللي ملوش
 * إعدادات لسه صاحبه محددش حاجة.
 */
export interface StoreSettings extends DeliveryRadius {
  minimums: Minimums;
}

const settingsPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}/shops`;

export async function fetchStoreSettings(token: string, accountId: string): Promise<StoreSettings[]> {
  const { settings } = await request<{ settings: StoreSettings[] }>(`${settingsPath(accountId)}/settings`, token);
  return settings;
}

export async function putStoreSettings(
  token: string,
  accountId: string,
  shopId: string,
  input: { deliveryRadiusKm: number | null; minimums?: Minimums },
): Promise<StoreSettings> {
  const { settings } = await request<{ settings: StoreSettings }>(
    `${settingsPath(accountId)}/${encodeURIComponent(shopId)}/settings`,
    token,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return settings;
}

/** عميل من عملاء النشاط — لـ«مبيعات». isTrader = أسعار الجملة */
export interface Customer {
  id: string;
  /** الاسم الأدبي — «الحاج فلان» */
  name: string;
  /** أرقام إنجليزي. '' = مش معروف */
  phone: string;
  isTrader: boolean;
}

export type CustomerInput = Omit<Customer, 'id'>;

const customersPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}/customers`;

export async function fetchCustomers(token: string, accountId: string): Promise<Customer[]> {
  const { customers } = await request<{ customers: Customer[] }>(customersPath(accountId), token);
  return customers;
}

export async function postCustomer(token: string, accountId: string, input: CustomerInput): Promise<Customer> {
  const { customer } = await request<{ customer: Customer }>(customersPath(accountId), token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return customer;
}

/*
 * المعرض — من غير تسجيل دخول. المتاجر نفسها (أساميها وأنشطتها ومكانها) من
 * وصلة، وأسواق بيضيف عليها نطاق التوصيل والأصناف.
 */

/** وحدة الصنف زي ما المشتري بيشوفها — الأسعار الأربعة من غير التكلفة والريت */
export type ShowroomUnit = Pick<ItemUnit, 'name' | 'unitContent' | 'onSWP' | 'onSRP' | 'onLWP' | 'onLRP'>;

export interface ShowroomItem {
  id: string;
  name: string;
  picture: string | null;
  units: ShowroomUnit[];
}

/** نطاق توصيل كل المتاجر اللي بتوصّل — المتجر اللي مش في الليستة مبيوصّلش */
export async function fetchDeliveryRadii(): Promise<DeliveryRadius[]> {
  const { stores } = await request<{ stores: DeliveryRadius[] }>('/api/showroom/stores', null);
  return stores;
}

/** صفحة المتجر في المعرض: نطاقه وحدوده الدنيا وأصنافه */
export interface ShowroomStoreDetails {
  deliveryRadiusKm: number | null;
  minimums: Minimums;
  items: ShowroomItem[];
}

export async function fetchShowroomStore(shopId: string): Promise<ShowroomStoreDetails> {
  const { store } = await request<{ store: ShowroomStoreDetails }>(
    `/api/showroom/stores/${encodeURIComponent(shopId)}`,
    null,
  );
  return store;
}
