import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/** نشاط تجاري زي ما وصلة بترجّعه — بناخد منه اللي محتاجينه بس */
export interface WaslaBusiness {
  accountId: string;
  name: string;
  abbreviation: string;
  /**
   * مقرات النشاط. المتجر هو مقر معلّم عليه isStore — وده اللي الأصناف بتتربط
   * بيه (شوف prisma/schema.prisma). اختياري: نسخة محفوظة من قبل المقرات كانت
   * بتيجي بـaddresses بدلها — ساعتها بنسأل وصلة من جديد.
   */
  premises?: { id: string; isStore: boolean }[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      waslaToken?: string;
      /** الأنشطة اللي المستخدم بيديرها، حسب وصلة */
      waslaBusinesses?: WaslaBusiness[];
      /** true = القايمة اتجابت من وصلة في الطلب ده، مش من النسخة المحفوظة */
      waslaFresh?: boolean;
      /** النشاط اللي في الرابط، بعد ما اتأكدنا إن المستخدم بيديره */
      business?: WaslaBusiness;
    }
  }
}

/** وصلة رفضت أو مردّتش — errorHandler بيحوّله للـstatus اللي فيه */
export class WaslaAuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'WaslaAuthError';
  }
}

/**
 * أسواق مبيعرفش المستخدمين بنفسه — وصلة هي اللي بتعرف.
 * مع كل طلب بنبعت توكن المستخدم لوصلة ونسألها: "إيه الأنشطة اللي الشخص ده بيديرها؟"
 * الرد الناجح بيقول حاجتين في طلب واحد: التوكن سليم، ودي صلاحياته.
 *
 * بنحفظ الرد دقيقة: من غيره كل ضغطة في أسواق = طلب لوصلة، ووصلة على
 * الخطة المجانية ممكن تكون نايمة وتاخد نص دقيقة تصحى.
 */
const CACHE_MS = 60_000;
/** وصلة النايمة على Render بتاخد حوالي ٥٠ ثانية تصحى */
const WASLA_TIMEOUT_MS = 60_000;
/** بعد العدد ده بنشيل المنتهي — عشان الخريطة متكبرش للأبد مع كل توكن جديد */
const CACHE_SWEEP_AT = 1000;

const cache = new Map<string, { businesses: WaslaBusiness[]; expiresAt: number }>();

async function fetchBusinesses(token: string): Promise<WaslaBusiness[]> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${env.waslaApiOrigin}/api/businesses`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(WASLA_TIMEOUT_MS),
    });
  } catch {
    throw new WaslaAuthError(503, 'Wasla unavailable');
  }
  if (res.status === 401) throw new WaslaAuthError(401, 'Invalid or expired token');
  if (!res.ok) throw new WaslaAuthError(502, 'Wasla error');

  const { businesses } = (await res.json()) as { businesses: WaslaBusiness[] };

  if (cache.size >= CACHE_SWEEP_AT) {
    const now = Date.now();
    for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key);
  }
  cache.set(token, { businesses, expiresAt: Date.now() + CACHE_MS });
  return businesses;
}

export async function requireWaslaUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new WaslaAuthError(401, 'Authentication required');

  const token = header.slice(7);
  const cached = cache.get(token);

  req.waslaToken = token;
  if (cached && cached.expiresAt > Date.now()) {
    req.waslaBusinesses = cached.businesses;
  } else {
    req.waslaBusinesses = await fetchBusinesses(token);
    req.waslaFresh = true;
  }
  next();
}

/**
 * النشاط ده بيديره المستخدم، وفيه اللي `satisfies` بتدوّر عليه؟
 *
 * لو مش لاقيه في النسخة المحفوظة بنسأل وصلة مرة كمان قبل ما نرفض: المستخدم
 * ممكن يكون عامل النشاط أو العنوان في وصلة من ثواني، والنسخة أقدم منه.
 */
export async function findManagedBusiness(
  req: Request,
  accountId: string,
  satisfies: (business: WaslaBusiness) => boolean = () => true,
): Promise<WaslaBusiness | undefined> {
  const match = (list: WaslaBusiness[] = []) =>
    list.find((b) => b.accountId === accountId && satisfies(b));

  const found = match(req.waslaBusinesses);
  if (found || req.waslaFresh) return found;

  req.waslaBusinesses = await fetchBusinesses(req.waslaToken!);
  req.waslaFresh = true;
  return match(req.waslaBusinesses);
}

/** 404 مش 403: الرد ميكشفش إن النشاط موجود أصلاً لحد مالوش علاقة بيه */
export async function requireBusinessAccess(req: Request, res: Response, next: NextFunction) {
  // String(): أنواع Express 5 بتعرّف أي param كـ string | string[]
  const business = await findManagedBusiness(req, String(req.params.accountId));
  if (!business) {
    res.status(404).json({ message: 'Business not found' });
    return;
  }
  req.business = business;
  next();
}

/** المستخدم نفسه زي ما وصلة بترجّعه من /api/me — للأوردرات: هو المحرّر وممكن يبقى المشتري */
export interface WaslaUser {
  sub: string;
  /** رقم حسابه في accounts بتاعة وصلة */
  accountId: string;
  name: string;
}

const users = new Map<string, { user: WaslaUser; expiresAt: number }>();

/** بعد requireWaslaUser: التوكن سليم، فبنسأل وصلة مين صاحبه. محفوظ دقيقة زي الأنشطة */
export async function currentUser(req: Request): Promise<WaslaUser> {
  const token = req.waslaToken!;
  const cached = users.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${env.waslaApiOrigin}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(WASLA_TIMEOUT_MS),
    });
  } catch {
    throw new WaslaAuthError(503, 'Wasla unavailable');
  }
  if (res.status === 401) throw new WaslaAuthError(401, 'Invalid or expired token');
  if (!res.ok) throw new WaslaAuthError(502, 'Wasla error');
  const { user } = (await res.json()) as { user: WaslaUser };
  // وصلة القديمة مكانتش بترجّع accountId — من غيره مفيش «to» للمستخدم لنفسه
  if (!user.accountId) throw new WaslaAuthError(502, 'Wasla profile has no accountId');

  if (users.size >= CACHE_SWEEP_AT) {
    const now = Date.now();
    for (const [key, entry] of users) if (entry.expiresAt <= now) users.delete(key);
  }
  users.set(token, { user, expiresAt: Date.now() + CACHE_MS });
  return user;
}

/** متجر من معرض وصلة (من غير توكن): اسمه ونشاطه. null = مش موجود أو مش متجر */
export async function fetchWaslaStore(
  shopId: string,
): Promise<{ id: string; name: string; business: { accountId: string; name: string } } | null> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${env.waslaApiOrigin}/api/stores/${encodeURIComponent(shopId)}`, {
      signal: AbortSignal.timeout(WASLA_TIMEOUT_MS),
    });
  } catch {
    throw new WaslaAuthError(503, 'Wasla unavailable');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new WaslaAuthError(502, 'Wasla error');
  return ((await res.json()) as { store: { id: string; name: string; business: { accountId: string; name: string } } }).store;
}
