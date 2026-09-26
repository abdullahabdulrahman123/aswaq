import type { Business, BusinessAddress, Premises } from '../context/AuthContext';
import { contactInputs, type Contact, type ContactInput } from './contacts';
import type { Coords } from './geolocate';
import { waslaApiOrigin } from './waslaAuth';

/**
 * بيانات النشاط التجاري الأساسية (الاسم، الاختصار، الأرقام، المقرات وعناوينها) عايشة في وصلة.
 *
 * كل طلب بيتبعت بتوكن الوصول اللي أسواق خده وقت تسجيل الدخول، ووصلة
 * بتتحقق منه من ناحيتها — مفيش حاجة بتتحقق هنا في المتصفح. ما عدا متاجر
 * المعرض: دي لأي زائر.
 */

/** طلب رجع بخطأ. status = 0 لو الطلب موصلش أصلاً */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * السيرفر رفض التوكن (401). withToken بيجدّده ويعيد مرة، فالخطأ ده بيوصل
 * للصفحة بس لو التجديد نفسه اترفض — يعني لازم تسجيل دخول تاني.
 */
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, 'جلستك مع وصلة انتهت. سجّل دخول تاني وكمّل.');
    this.name = 'SessionExpiredError';
  }
}

const MESSAGES: Record<number, string> = {
  400: 'البيانات فيها حاجة مش مظبوطة. راجعها وجرّب تاني.',
  404: 'مش لاقيين ده — يمكن يكون اتحذف.',
};

/** token = null للطلبات اللي مش محتاجة تسجيل دخول (متاجر المعرض) */
async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${waslaApiOrigin()}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'مقدرناش نوصل لوصلة. اتأكد من النت وجرّب تاني.');
  }

  if (res.status === 401) throw new SessionExpiredError();
  if (!res.ok) {
    throw new ApiError(res.status, MESSAGES[res.status] ?? 'حصلت مشكلة في السيرفر. جرّب كمان شوية.');
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const businessPath = (accountId: string) => `/api/businesses/${encodeURIComponent(accountId)}`;

/**
 * وصلة القديمة: قبل المقرات كانت بترجّع addresses بدل premises، وقبل جهات
 * الاتصال مكانش فيه contacts. لحد ما النسختين يتنشروا الاتنين، الصفحات تشوف
 * ليستات فاضية بدل ما تقع.
 */
const normalizePremises = (premises: Premises): Premises => ({ ...premises, contacts: premises.contacts ?? [] });
const normalizeBusiness = (business: Business): Business => ({
  ...business,
  contacts: business.contacts ?? [],
  premises: (business.premises ?? []).map(normalizePremises),
});

/** المستخدم زي ما وصلة بتعرضه — نفس أسماء الـclaims اللي في id_token، وأرقامه */
export interface WaslaProfile {
  sub: string;
  name: string;
  email: string;
  picture: string | null;
  /** مش موجودة في وصلة اللي قبل جهات الاتصال */
  contacts?: Contact[];
}

/** الاسم والصورة ممكن يتغيّروا من جهاز تاني بعد الدخول */
export async function fetchProfile(token: string): Promise<WaslaProfile> {
  const { user } = await request<{ user: WaslaProfile }>('/api/me', token);
  return user;
}

/** null = شيل الصورة */
export async function patchProfilePicture(token: string, picture: string | null): Promise<WaslaProfile> {
  const { user } = await request<{ user: WaslaProfile }>('/api/me', token, {
    method: 'PATCH',
    body: JSON.stringify({ picture }),
  });
  return user;
}

/** لوجو النشاط. null = شيل اللوجو */
export async function patchBusinessPicture(token: string, accountId: string, picture: string | null): Promise<Business> {
  const { business } = await request<{ business: Business }>(businessPath(accountId), token, {
    method: 'PATCH',
    body: JSON.stringify({ picture }),
  });
  return normalizeBusiness(business);
}

/**
 * متجر في المعرض — وصلة مبتبعتش للزائر غير اسمه ومكانه على الخريطة والنشاط
 * اللي تبعه. نطاق التوصيل مش هنا: ده في أسواق (fetchDeliveryRadii).
 */
export interface ShowroomStore {
  /** id المقر في وصلة — نفس الـshopId بتاع أصناف المتجر في أسواق */
  id: string;
  name: string;
  /** null = المقر من غير عنوان (بيانات قديمة بس) — ساعتها مفيش مسافة ولا توصيل */
  location: Coords | null;
  business: Pick<Business, 'accountId' | 'name' | 'abbreviation' | 'picture'>;
}

/** وصلة اللي قبل المكان كانت مبترجّعش location */
const normalizeStore = (store: ShowroomStore): ShowroomStore => ({ ...store, location: store.location ?? null });

/**
 * عميل في «مبيعات» — حساب في وصلة، مستخدم أو نشاط. الشركة بتاخد أسعار الجملة
 * والمستخدم القطاعي.
 */
export interface Customer {
  accountId: string;
  kind: 'user' | 'business';
  name: string;
  picture: string | null;
  abbreviation: string | null;
}

/**
 * walkIn: حسابين ثابتين لغير المسجلين (مستخدم وشركة). matches: اللي إيميله أو
 * رقمه مطابق q بالظبط — وصلة مبتعملش بحث جزئي عشان محدش يتصفّح أسامي الناس.
 */
export async function searchCustomers(token: string, q: string): Promise<{ walkIn: Customer[]; matches: Customer[] }> {
  return request<{ walkIn: Customer[]; matches: Customer[] }>(`/api/customers?q=${encodeURIComponent(q)}`, token);
}

/** كل المتاجر من كل الأنشطة، الأحدث الأول — من غير تسجيل دخول */
export async function fetchStores(): Promise<ShowroomStore[]> {
  const { stores } = await request<{ stores: ShowroomStore[] }>('/api/stores', null);
  return stores.map(normalizeStore);
}

/** متجر واحد لصفحته. 404 = مش موجود، أو بقى مخزن بس */
export async function fetchStore(storeId: string): Promise<ShowroomStore> {
  const { store } = await request<{ store: ShowroomStore }>(`/api/stores/${encodeURIComponent(storeId)}`, null);
  return normalizeStore(store);
}

/*
 * «عناويني»: عناوين المستخدم نفسه في وصلة، من غير مقر — البيت أو الشغل.
 * المشتري بيختار منها مكانه في المعرض.
 */

function addressBody({ id: _id, ...fields }: BusinessAddress): string {
  return JSON.stringify(fields);
}

export async function fetchMyAddresses(token: string): Promise<BusinessAddress[]> {
  const { addresses } = await request<{ addresses: BusinessAddress[] }>('/api/me/addresses', token);
  return addresses;
}

/** 400 = وصل لأقصى عدد عناوين */
export async function postMyAddress(token: string, address: BusinessAddress): Promise<BusinessAddress> {
  const { address: saved } = await request<{ address: BusinessAddress }>('/api/me/addresses', token, {
    method: 'POST',
    body: addressBody(address),
  });
  return saved;
}

export async function putMyAddress(token: string, address: BusinessAddress): Promise<BusinessAddress> {
  const { address: saved } = await request<{ address: BusinessAddress }>(
    `/api/me/addresses/${encodeURIComponent(address.id)}`,
    token,
    { method: 'PUT', body: addressBody(address) },
  );
  return saved;
}

export async function deleteMyAddress(token: string, addressId: string): Promise<void> {
  await request<void>(`/api/me/addresses/${encodeURIComponent(addressId)}`, token, { method: 'DELETE' });
}

export async function fetchBusinesses(token: string): Promise<Business[]> {
  const { businesses } = await request<{ businesses: Business[] }>('/api/businesses', token);
  return businesses.map(normalizeBusiness);
}

/** 409 = الاختصار مستخدم في نشاط تاني عند نفس المستخدم. الأرقام اختيارية: أرقام النشاط العامة */
export async function postBusiness(
  token: string,
  input: Pick<Business, 'name' | 'abbreviation'> & { contacts: ContactInput[] },
): Promise<Business> {
  const { business } = await request<{ business: Business }>('/api/businesses', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeBusiness(business);
}

/**
 * المقر زي ما وصلة بتستلمه: اسمه ونوعه وعنوانه وأرقامه، من غير الـids. الأرقام
 * ليستة كاملة بتحل محل القديمة.
 */
function premisesBody({ name, isStore, isWarehouse, address, contacts }: Omit<Premises, 'id'>): string {
  if (!address) throw new Error('المقر محتاج عنوان');
  const { id: _addressId, ...fields } = address;
  return JSON.stringify({ name, isStore, isWarehouse, address: fields, contacts: contactInputs(contacts) });
}

/** المقر وعنوانه وأرقامه بيتحفظوا مع بعض — مفيش مقر من غير عنوان */
export async function postPremises(token: string, accountId: string, premises: Omit<Premises, 'id'>): Promise<Premises> {
  const { premises: saved } = await request<{ premises: Premises }>(`${businessPath(accountId)}/premises`, token, {
    method: 'POST',
    body: premisesBody(premises),
  });
  return normalizePremises(saved);
}

export async function putPremises(token: string, accountId: string, { id, ...premises }: Premises): Promise<Premises> {
  const { premises: saved } = await request<{ premises: Premises }>(
    `${businessPath(accountId)}/premises/${encodeURIComponent(id)}`,
    token,
    { method: 'PUT', body: premisesBody(premises) },
  );
  return normalizePremises(saved);
}

/** المقر وعنوانه بيتمسحوا مع بعض */
export async function deletePremises(token: string, accountId: string, premisesId: string): Promise<void> {
  await request<void>(`${businessPath(accountId)}/premises/${encodeURIComponent(premisesId)}`, token, {
    method: 'DELETE',
  });
}

/*
 * أرقام الحساب العامة (مش تبع مقر): أرقام النشاط من صفحته، وأرقام المستخدم من
 * «حسابي». نفس الشكل للاتنين — الفرق في الرابط بس. 409 = نفس النوع والرقم موجودين.
 */

function contactBody({ type, value }: ContactInput): string {
  return JSON.stringify({ type, value });
}

async function postContact(token: string, basePath: string, input: ContactInput): Promise<Contact> {
  const { contact } = await request<{ contact: Contact }>(`${basePath}/contacts`, token, {
    method: 'POST',
    body: contactBody(input),
  });
  return contact;
}

async function putContact(token: string, basePath: string, contactId: string, input: ContactInput): Promise<Contact> {
  const { contact } = await request<{ contact: Contact }>(`${basePath}/contacts/${encodeURIComponent(contactId)}`, token, {
    method: 'PUT',
    body: contactBody(input),
  });
  return contact;
}

async function deleteContact(token: string, basePath: string, contactId: string): Promise<void> {
  await request<void>(`${basePath}/contacts/${encodeURIComponent(contactId)}`, token, { method: 'DELETE' });
}

export const postBusinessContact = (token: string, accountId: string, input: ContactInput) =>
  postContact(token, businessPath(accountId), input);
export const putBusinessContact = (token: string, accountId: string, contactId: string, input: ContactInput) =>
  putContact(token, businessPath(accountId), contactId, input);
export const deleteBusinessContact = (token: string, accountId: string, contactId: string) =>
  deleteContact(token, businessPath(accountId), contactId);

export const postMyContact = (token: string, input: ContactInput) => postContact(token, '/api/me', input);
export const putMyContact = (token: string, contactId: string, input: ContactInput) =>
  putContact(token, '/api/me', contactId, input);
export const deleteMyContact = (token: string, contactId: string) => deleteContact(token, '/api/me', contactId);
