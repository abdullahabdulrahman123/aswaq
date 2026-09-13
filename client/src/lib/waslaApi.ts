import type { Business, BusinessAddress } from '../context/AuthContext';
import { waslaApiOrigin } from './waslaAuth';

/**
 * بيانات النشاط التجاري الأساسية (الاسم، الاختصار، العناوين) عايشة في وصلة.
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

/** التوكن انتهى (وصلة بتديه ساعة) أو اتلغى — لازم تسجيل دخول تاني */
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

export async function fetchBusinesses(token: string): Promise<Business[]> {
  const { businesses } = await request<{ businesses: Business[] }>('/api/businesses', token);
  return businesses;
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
  return business;
}

export async function postAddress(
  token: string,
  accountId: string,
  fields: Omit<BusinessAddress, 'id'>,
): Promise<BusinessAddress> {
  const { address } = await request<{ address: BusinessAddress }>(
    `${businessPath(accountId)}/addresses`,
    token,
    { method: 'POST', body: JSON.stringify(fields) },
  );
  return address;
}

export async function putAddress(
  token: string,
  accountId: string,
  { id, ...fields }: BusinessAddress,
): Promise<BusinessAddress> {
  const { address } = await request<{ address: BusinessAddress }>(
    `${businessPath(accountId)}/addresses/${encodeURIComponent(id)}`,
    token,
    { method: 'PUT', body: JSON.stringify(fields) },
  );
  return address;
}

export async function deleteAddress(token: string, accountId: string, addressId: string): Promise<void> {
  await request<void>(`${businessPath(accountId)}/addresses/${encodeURIComponent(addressId)}`, token, {
    method: 'DELETE',
  });
}
