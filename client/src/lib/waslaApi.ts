import type { Business, Premises } from '../context/AuthContext';
import { waslaApiOrigin } from './waslaAuth';

/**
 * بيانات النشاط التجاري الأساسية (الاسم، الاختصار، المقرات وعناوينها) عايشة في وصلة.
 *
 * كل طلب بيتبعت بتوكن الوصول اللي أسواق خده وقت تسجيل الدخول، ووصلة
 * بتتحقق منه من ناحيتها — مفيش حاجة بتتحقق هنا في المتصفح.
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

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${waslaApiOrigin()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
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
 * وصلة قبل المقرات كانت بترجّع addresses بدل premises. لحد ما النسختين يتنشروا
 * الاتنين، الصفحات تشوف ليستة مقرات فاضية بدل ما تقع.
 */
const withPremises = (business: Business): Business => ({ ...business, premises: business.premises ?? [] });

/** المستخدم زي ما وصلة بتعرضه — نفس أسماء الـclaims اللي في id_token */
export interface WaslaProfile {
  sub: string;
  name: string;
  email: string;
  picture: string | null;
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
  return withPremises(business);
}

export async function fetchBusinesses(token: string): Promise<Business[]> {
  const { businesses } = await request<{ businesses: Business[] }>('/api/businesses', token);
  return businesses.map(withPremises);
}

/** 409 = الاختصار مستخدم في نشاط تاني عند نفس المستخدم */
export async function postBusiness(
  token: string,
  input: Pick<Business, 'name' | 'abbreviation'>,
): Promise<Business> {
  const { business } = await request<{ business: Business }>('/api/businesses', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return withPremises(business);
}

/** المقر زي ما وصلة بتستلمه: اسمه ونوعه وعنوانه، من غير الـids */
function premisesBody({ name, isStore, isWarehouse, address }: Omit<Premises, 'id'>): string {
  if (!address) throw new Error('المقر محتاج عنوان');
  const { id: _addressId, ...fields } = address;
  return JSON.stringify({ name, isStore, isWarehouse, address: fields });
}

/** المقر وعنوانه بيتحفظوا مع بعض — مفيش مقر من غير عنوان */
export async function postPremises(token: string, accountId: string, premises: Omit<Premises, 'id'>): Promise<Premises> {
  const { premises: saved } = await request<{ premises: Premises }>(`${businessPath(accountId)}/premises`, token, {
    method: 'POST',
    body: premisesBody(premises),
  });
  return saved;
}

export async function putPremises(token: string, accountId: string, { id, ...premises }: Premises): Promise<Premises> {
  const { premises: saved } = await request<{ premises: Premises }>(
    `${businessPath(accountId)}/premises/${encodeURIComponent(id)}`,
    token,
    { method: 'PUT', body: premisesBody(premises) },
  );
  return saved;
}

/** المقر وعنوانه بيتمسحوا مع بعض */
export async function deletePremises(token: string, accountId: string, premisesId: string): Promise<void> {
  await request<void>(`${businessPath(accountId)}/premises/${encodeURIComponent(premisesId)}`, token, {
    method: 'DELETE',
  });
}
