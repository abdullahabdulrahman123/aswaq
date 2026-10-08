import type { PriceField } from './itemUnits';
import { ApiError, SessionExpiredError } from './waslaApi';

/**
 * سيرفر أسواق — المحلات والأصناف. (بيانات النشاط الأساسية في وصلة، شوف waslaApi.)
 *
 * التوكن هو نفسه توكن وصلة: أسواق بيسأل وصلة بيه عن المستخدم وأنشطته،
 * فمفيش تسجيل دخول تاني ولا توكن تاني.
 */
export const ORIGIN = (import.meta.env.VITE_ASWAQ_API_ORIGIN ?? '').trim().replace(/\/+$/, '');

/** سيرفر الأصناف متوصّل؟ لو لأ الصفحات بتقول كده بدل ما ترمي خطأ */
export const aswaqApiConfigured = Boolean(ORIGIN);
/** سيرفر أسواق — الـsocket.io (الطلبات الواردة) على نفس الأصل */
export const aswaqApiOrigin = ORIGIN;

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
  /**
   * المنافذ اللي الوحدة مبتتباعش فيها — مفاتيح الأسعار نفسها (مكالمة ٦ أكتوبر: تشيك تحت
   * كل سعر في كارت الصنف). فاضي أو مش موجود = بتتباع في كله
   */
  hiddenIn?: PriceField[];
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
  422: 'فيه أصناف سعرها لسه متحددش — شيلها الأول.',
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
    throw new ApiError(0, 'مقدرناش نوصل للسيرفر. اتأكد من النت وجرّب تاني.');
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

/** تشيكات وحدة في كارت الصنف — بتتحفظ أول ما تتداس، وبتنزل على نسخ الصنف في المتاجر */
export async function putUnitVisibility(token: string, accountId: string, itemId: string, unit: string, hiddenIn: PriceField[]): Promise<Item> {
  const { item } = await request<{ item: Item }>(`${itemsPath(accountId)}/${encodeURIComponent(itemId)}/visibility`, token, {
    method: 'PUT',
    body: JSON.stringify({ unit, hiddenIn }),
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

/*
 * المعرض — من غير تسجيل دخول. المتاجر نفسها (أساميها وأنشطتها ومكانها) من
 * وصلة، وأسواق بيضيف عليها نطاق التوصيل والأصناف.
 */

/** وحدة الصنف زي ما المشتري بيشوفها — الأسعار الأربعة من غير التكلفة والريت */
export type ShowroomUnit = Pick<ItemUnit, 'name' | 'unitContent' | 'onSWP' | 'onSRP' | 'onLWP' | 'onLRP' | 'hiddenIn'>;

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

/*
 * الأوردرات — بسكيمة العميل. السيرفر هو اللي بيحسب الأسعار والإجماليات،
 * والواجهة بتبعت الكميات بس. كل الفلوس بالقرش.
 */
export interface OrderAmount {
  quantity: number;
  unit: string;
  price: number;
  tax: number;
  avg: number;
  totalItems: number;
}

export interface OrderDetail {
  itemId: string;
  item: string;
  unit: string;
  unitContent: number;
  bonusQuantity: number;
  quantity: number;
  totalQuantity: number;
  originalPrice: number;
  discount: number;
  price: number;
  tax: number;
  avg: number;
  profit: number;
  totalItems: number;
  totalDiscount: number;
  totalTax: number;
  netTotal: number;
  /** وزن الوحدة بالجرام — الفاضي صفر */
  weight: number | null;
  /** حجم الوحدة بالسنتيمتر المكعب — الأوردرات اللي قبل الحجم من غيره */
  volume?: number | null;
  /** weight × totalQuantity */
  totalWeight?: number | null;
  /** volume × totalQuantity */
  totalVolume?: number | null;
  /** الوحدة ملهاش سعر — مينفعش تتأكد */
  unpriced: boolean;
  /** وزن الوحدة أو حجمها مش متسجّل (اتحسب صفر) — الأوردرات اللي قبل ٢٧ سبتمبر من غيره */
  measuresMissing?: boolean;
  demanded: OrderAmount;
  deviation: OrderAmount;
}

export interface Order {
  id: string;
  /** رقم الفاتورة — null في المسودة */
  number: number | null;
  /** draft | order | [مراحل النشاط] | done | cancelled — lib/orderFlow */
  state: 'draft' | 'order' | 'done' | 'cancelled' | string;
  /**
   * الطلب بيمر بتلات حالات غير المراحل (رسالة العميل ٨ أكتوبر): draft ← order ← invoice — مع
   * المرحلة اللي النشاط اختارها. الفاتورة مبتتعدّلش ولا بتتلغي
   */
  kind?: 'draft' | 'order' | 'invoice' | null;
  /** اسم المرحلة من السيرفر (مكالمة ٢ أكتوبر: المراحل من إعدادات النشاط البائع) */
  stateLabel?: string;
  /** لون المرحلة من إعدادات النشاط البائع (رسالة العميل ٦ أكتوبر) — مفتاح في lib/stageColors */
  stateColor?: string;
  /** زرار المرحلة اللي بعدها — null = آخر مرحلة */
  nextAction?: string | null;
  /** me:<shopId> أو <saleId>:<shopId> — نفس مفتاح الأوردر على الجهاز */
  ref: string;
  createdAt: string;
  updatedAt: string;
  checkedOutAt: string | null;
  /** ساعة «إتمام» */
  completedAt?: string | null;
  /** الإلغاء (مكالمة ٥ أكتوبر): مين لغى (البائع ولا المشتري) وليه */
  cancellation?: { by: 'seller' | 'buyer'; person: { acc: string; name: string }; reason: string; at: string } | null;
  /** onsite = «مبيعات» (الشباك)، online = المعرض */
  source?: 'onsite' | 'online' | null;
  creator: { acc: string; name: string };
  /** آخر واحد عدّل الأوردر */
  editor?: { acc: string; name: string } | null;
  seller: { acc: string; name: string };
  /** subAcc = الحساب الفرعي بتاع المتجر في وصلة */
  from: { acc: string; subAcc: string | null };
  /** المتجر (المقر) — الأوردرات الأولى من غيره، وكان from.subAcc هو المقر */
  shopId?: string | null;
  to: { acc: string; subAcc: string | null };
  names: { business: string; store: string; buyer: string; buyerPhone: string; buyerKind: 'user' | 'business' };
  method: 'pickup' | 'delivery';
  address: string;
  /** ميعاد التسليم ISO (رسالة العميل ٦ أكتوبر) — الأوردرات اللي قبله من غيره */
  deliveryAt?: string | null;
  /** ملاحظات التسليم للسواق */
  deliveryNotes?: string | null;
  /** بيعة «مبيعات» زي ما اتبعتت — null للمستخدم لنفسه */
  sale: unknown;
  totalAvg: number;
  totalProfit: number;
  totalItems: number;
  totalTax: number;
  totalDiscount: number;
  netTotal: number;
  totalDemanded: number;
  totalDeviation: number;
  /** بالجرام */
  totalWeight: number;
  /** بالسنتيمتر المكعب — الأوردرات اللي قبل الحجم من غيره */
  totalVolume?: number | null;
  details: OrderDetail[];
}

export interface DraftInput {
  shopId: string;
  method: 'pickup' | 'delivery';
  /** للمستخدم لنفسه: نشاطه لو بيشتري بيه. فاضي = حسابه هو */
  to?: string;
  sale?: unknown;
  /** ميعاد التسليم وملاحظاته للمشتري من المعرض — في البيعة جوه sale */
  deliveryAt?: string | null;
  deliveryNotes?: string;
  /** price: السعر اللي البائع كتبه بالقرش — السيرفر بياخده في «مبيعات» بس */
  lines: { itemId: string; unitName: string; quantity: number; price?: number }[];
}

/** null = السطور فاضية والمسودة اتمسحت */
export async function putDraft(token: string, input: DraftInput): Promise<Order | null> {
  const { order } = await request<{ order: Order | null }>('/api/orders/draft', token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return order;
}

export interface LineInput {
  itemId: string;
  unitName: string;
  /** صفر = الصنف يتشال */
  quantity: number;
  /** السعر اللي البائع كتبه في «مبيعات» بالقرش */
  price?: number;
}

/**
 * صنف واحد في مسودة موجودة — الحفظ صنف صنف، بطلب العميل. null = ده كان آخر
 * صنف والمسودة اتمسحت. 404 أو 409 = المسودة مش موجودة أو اتأكدت.
 */
export async function putLine(token: string, orderId: string, line: LineInput): Promise<Order | null> {
  const { order } = await request<{ order: Order | null }>(`/api/orders/${encodeURIComponent(orderId)}/lines`, token, {
    method: 'PUT',
    body: JSON.stringify(line),
  });
  return order;
}

/**
 * صنف واحد في فاتورة اتأكدت (مكالمة ٢ أكتوبر) — للنشاط البائع بالصلاحيات. 403 =
 * الصلاحية مش معاه، 409 = الفاتورة خلصت أو لسه مسودة.
 */
export async function putConfirmedLine(token: string, orderId: string, line: LineInput): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/confirmed-lines`, token, {
    method: 'PUT',
    body: JSON.stringify(line),
  });
  return order;
}

/**
 * رأس فاتورة مؤكدة (رسالة العميل ٦ أكتوبر) — للنشاط البائع بصلاحية «تعديل بيانات
 * فاتورة البيع». 403 = الصلاحية مش معاه، 409 = خلصت، 422 = طلب معرض والعميل اتغيّر
 */
export async function putOrderHeader(token: string, orderId: string, header: unknown): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/header`, token, {
    method: 'PUT',
    body: JSON.stringify(header),
  });
  return order;
}

/** مرحلة من قالب مراحل البيع — label اللي المشتري بيشوفه، وaction الزرار */
export interface StageTemplate {
  key: string;
  label: string;
  action: string;
}

export interface BusinessSettings {
  /** المراحل اللي بين «مؤكد» و«مكتمل» بالترتيب */
  salesStages: string[];
  /** لون كل مرحلة من القالب (رسالة العميل ٦ أكتوبر) — مفتاح المرحلة ← مفتاح اللون */
  stageColors: Record<string, string>;
  /**
   * الطلب بيبقى فاتورة مع المرحلة دي (رسالة العميل ٨ أكتوبر): مفتاح من salesStages أو done.
   * السيرفر بيرجّع اللي بيتطبّق فعلاً — الافتراضي «تسليم» لو مفعّلة، وإلا «إتمام»
   */
  invoiceStage?: string;
}

/** الإعدادات ومعاها القالب والألوان المتاحة والثابتة (مؤكد ومكتمل وملغية) */
export interface SettingsResponse {
  settings: BusinessSettings;
  stageTemplate: StageTemplate[];
  stageColorChoices: string[];
  fixedColors: Record<string, string>;
}

const businessSettingsPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}/settings`;

/** إعدادات النشاط والقالب اللي بيختار منه (مكالمة ٢ أكتوبر) */
export function fetchSettings(token: string, accountId: string) {
  return request<SettingsResponse>(businessSettingsPath(accountId), token);
}

/** لصاحب الشركة بس — 403 لغيره، و400 لو مرحلتين بنفس اللون */
export function saveSettings(token: string, accountId: string, settings: BusinessSettings) {
  return request<SettingsResponse>(businessSettingsPath(accountId), token, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

/** صلاحية من رصيد أسواق — categories مفاتيح أقسام (sales…) */
export interface PermissionInfo {
  key: string;
  name: string;
  categories: string[];
  /** بتتفتح للموظف الجديد لوحدها */
  defaultOn: boolean;
}

export function fetchPermissions(token: string) {
  return request<{ permissions: PermissionInfo[]; categories: Record<string, string> }>('/api/permissions', token);
}

/** المتجر اللي الأوردر منه — الأوردرات الأولى كانت شايلاه في from.subAcc */
export const orderShopId = (order: Order) => order.shopId ?? order.from.subAcc ?? '';

/** «الطلبات الواردة»: الأوردرات المؤكدة اللي النشاط ده بائعها — الأحدث الأول */
export async function fetchIncoming(token: string, accountId: string): Promise<Order[]> {
  const { orders } = await request<{ orders: Order[] }>(`/api/businesses/${encodeURIComponent(accountId)}/incoming`, token);
  return orders;
}

/** مؤشرات مقر واحد — اسمه من آخر أوردر منه */
export interface PremisesMetrics {
  premisesId: string;
  name: string;
  achieved: number;
  inProcess: number;
  future: number;
}

/**
 * «مؤشرات المبيعات» (مكالمة ٦ أكتوبر) — النهارده بتوقيت مصر، بالقرش: المحققة (اتمت
 * النهارده)، وفي الطريق (عدّت التأكيد ولسه مخلصتش)، والمستقبلية (مؤكدة بس). معدلات
 * البيع null لحد ما حسابها يتحدد
 */
export interface BusinessMetrics {
  date: string;
  achieved: number;
  inProcess: number;
  future: number;
  premises: PremisesMetrics[];
  sr7: number | null;
  sr30: number | null;
  sr91: number | null;
  sr182: number | null;
  sr365: number | null;
  updatedAt: string;
}

/** 403 = «مؤشرات المبيعات» مش مفتوحة للموظف ده */
export async function fetchMetrics(token: string, accountId: string): Promise<BusinessMetrics> {
  const { metrics } = await request<{ metrics: BusinessMetrics }>(`/api/businesses/${encodeURIComponent(accountId)}/metrics`, token);
  return metrics;
}

/**
 * أوردراتي، ومعاها مسودات «مبيعات» بتاعة أنشطتي اللي عملها غيري (مكالمة ٨ أكتوبر).
 * me = حسابي في وصلة — عشان اسم اللي عمل المسودة يظهر لو مش أنا
 */
export async function fetchOrders(token: string): Promise<{ orders: Order[]; me: string | null }> {
  const { orders, me } = await request<{ orders: Order[]; me?: string }>('/api/orders', token);
  return { orders, me: me ?? null };
}

/**
 * «طلباتي» (رسالة العميل ٦ أكتوبر): الأوردرات اللي المشتري فيها الحساب المختار —
 * نشاط (as) أو المستخدم نفسه (من غير as)
 */
export async function fetchPurchases(token: string, as: string | null): Promise<Order[]> {
  const { orders } = await request<{ orders: Order[] }>(`/api/orders/purchases${as ? `?as=${encodeURIComponent(as)}` : ''}`, token);
  return orders;
}

export async function fetchOrder(token: string, orderId: string): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}`, token);
  return order;
}

/** 422 = فيه وحدة من غير سعر، 409 = اتأكد قبل كده */
/** المرحلة اللي بعدها («إتمام») — للنشاط البائع. 409 = اتنقل من مكان تاني */
export async function advanceOrder(token: string, orderId: string): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/advance`, token, { method: 'POST' });
  return order;
}

/** إلغاء فاتورة مؤكدة لسه مخلصتش، بسبب — البائع في أي مرحلة، والمشتري وهي «مؤكد» بس */
export async function cancelOrder(token: string, orderId: string, reason: string): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/cancel`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return order;
}

/**
 * خزنة (مكالمة ٧ أكتوبر) — من وصلة، ورصيدها من الجدول الحاكم في أسواق: اللي دخلها − اللي
 * طلع منها، ورصيد أول المدة أول حركة فيها (مكالمة ٨ أكتوبر). كل المبالغ بالقرش. mine = في
 * عهدة المستخدم ده (التحصيل بيروح لها)، openingRecorded = رصيد أول المدة اتسجّل حركة (أو صفر)
 */
export interface Safe {
  id: string;
  subAccountId: string;
  name: string;
  custodian: { accountId: string; name: string };
  /** رصيد أول المدة زي ما اتكتب — «كبيان» في جدول الخزن */
  openingBalance: number;
  balance: number;
  mine: boolean;
  openingRecorded: boolean;
  creator: { accountId: string; name: string };
  createdAt: string;
}

const safesPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}/safes`;

export async function fetchSafes(token: string, accountId: string): Promise<Safe[]> {
  const { safes } = await request<{ safes: Safe[] }>(safesPath(accountId), token);
  return safes;
}

/**
 * خزنة جديدة — لصاحب الشركة: بتتعمل في وصلة ورصيد أول المدة بيتسجّل حركة في نفس الطلب.
 * openingRecorded: false = الخزنة اتعملت والحركة لأ (postSafeOpening). 400 = المسؤول مش موظف
 */
export async function postSafe(token: string, accountId: string, input: { name: string; custodianId: string; openingBalance: number }) {
  return request<{ safe: Safe }>(safesPath(accountId), token, { method: 'POST', body: JSON.stringify(input) });
}

/** رصيد أول المدة لخزنة اتعملت وحركتها متسجّلتش. 409 = اتسجّل قبل كده */
export async function postSafeOpening(token: string, accountId: string, safeId: string) {
  return request<{ safe: Safe }>(`${safesPath(accountId)}/${encodeURIComponent(safeId)}/opening`, token, { method: 'POST' });
}

/** إيصال استلام نقدية — «تحصيل» على فاتورة بيع (financials، kind receipt) */
export interface Receipt {
  id: string;
  number: number;
  amount: number;
  orderId: string;
  invoiceNumber: number | null;
  names: { from: string; to: string; safe: string };
  notes: string | null;
  creator: { acc: string; name: string };
  createdAt: string;
}

export interface Collection {
  receipts: Receipt[];
  /** اللي اتحصّل لحد دلوقتي */
  paid: number;
  /** إجمالي الفاتورة − اللي اتحصّل */
  remaining: number;
}

export async function fetchReceipts(token: string, orderId: string): Promise<Collection> {
  return request<Collection>(`/api/orders/${encodeURIComponent(orderId)}/receipts`, token);
}

/** 403 = الخزنة مش في عهدته، 409 = الفاتورة اتلغت، 422 = المبلغ أكبر من الباقي */
export async function postReceipt(token: string, orderId: string, input: { safeId: string; amount: number; notes?: string }) {
  return request<{ receipt: Receipt; paid: number; remaining: number }>(`/api/orders/${encodeURIComponent(orderId)}/receipts`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function checkoutOrder(token: string, orderId: string): Promise<Order> {
  const { order } = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/checkout`, token, {
    method: 'POST',
  });
  return order;
}
