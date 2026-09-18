import { ApiError, SessionExpiredError } from './waslaApi';
import { refreshSession, RefreshRejectedError, revokeRefreshToken, type WaslaSession } from './waslaAuth';

/**
 * جلسة وصلة في المتصفح: توكن وصول عمره ساعة، وrefresh token بيجدّده.
 *
 * المرجع هنا localStorage مش حالة React، لأن التابات المفتوحة (والشباك الصغير
 * اللي الدخول بيخلص فيه على أندرويد) كلهم بيشاركوا نفس الجلسة، ووصلة بتغيّر
 * الـrefresh token مع كل تجديد. لو تابين جدّدوا بنفس التوكن مع بعض، وصلة
 * بتعتبر التاني سرقة وبتلغي الجلسة كلها — فالتجديد بيحصل تحت قفل واحد على
 * مستوى المتصفح (Web Locks)، واللي كان مستني بيلاقي التوكن الجديد جاهز.
 */

export const SESSION_KEY = 'aswaq_session';
const REFRESH_LOCK = 'aswaq_wasla_refresh';

/**
 * بنجدّد قبل ما التوكن يخلص بدقيقتين: سيرفر وصلة على الخطة المجانية ممكن
 * ياخد قرب دقيقة يصحى، فمنبعتش توكن هيموت وهو في السكة.
 */
const RENEW_BEFORE_MS = 2 * 60_000;

export function loadSession(): WaslaSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as WaslaSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: WaslaSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // المتصفح قافل التخزين — الدخول نفسه محتاجه، فمش هيوصل هنا غالباً
  }
}

/** فيه جلسة تكمّل من غير دخول تاني؟ توكن لسه عايش، أو refresh token يجدّده */
export function sessionUsable(): boolean {
  const session = loadSession();
  return Boolean(session && (session.refreshToken || session.expiresAt > Date.now()));
}

/** rejected = توكن السيرفر لسه رافضه، فمنبعتوش تاني حتى لو ساعته بتقول إنه عايش */
function usable(session: WaslaSession, rejected?: string): boolean {
  return session.accessToken !== rejected && session.expiresAt - RENEW_BEFORE_MS > Date.now();
}

/** متصفحات قديمة من غير Web Locks: على الأقل التاب نفسه ميجدّدش مرتين مع بعض */
let queue: Promise<unknown> = Promise.resolve();

async function exclusive<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    // await: تعريفات TypeScript للقفل مش بتفك الـPromise اللي task بترجّعها
    return await navigator.locks.request(REFRESH_LOCK, task);
  }
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * توكن وصول صالح: الموجود لو لسه عايش، وإلا جديد بالـrefresh token.
 *
 * rejected = توكن السيرفر رجّعله 401 وساعته لسه مخلصتش (اتلغى، أو ساعة
 * الجهاز مش مظبوطة) — بنجدّد بدل ما نبعته تاني.
 *
 * بيرمي SessionExpiredError لو مفيش جلسة أو وصلة رفضت التجديد (لازم دخول
 * تاني)، وApiError(0) لو وصلة مردّتش (الجلسة سليمة، والطلب الجاي هيجرّب تاني).
 */
export async function accessToken(rejected?: string): Promise<string> {
  const current = loadSession();
  if (current && usable(current, rejected)) return current.accessToken;

  const session = await exclusive(async () => {
    // بنقرا تاني جوه القفل: يمكن تاب تاني جدّد وإحنا مستنيين
    const latest = loadSession();
    if (latest && usable(latest, rejected)) return latest;
    if (!latest?.refreshToken) throw new SessionExpiredError();

    let next: WaslaSession;
    try {
      next = await refreshSession(latest.refreshToken);
    } catch (err) {
      if (!(err instanceof RefreshRejectedError)) {
        throw new ApiError(0, 'مقدرناش نوصل لوصلة. اتأكد من النت وجرّب تاني.');
      }
      // ميّت — منبعتوش تاني مع كل طلب. لو اتغيّر وإحنا مستنيين، ده مش بتاعنا
      if (loadSession()?.refreshToken === latest.refreshToken) saveSession(null);
      throw new SessionExpiredError();
    }

    // لو المستخدم خرج أو دخل تاني وإحنا مستنيين وصلة، اللي اتكتب هو الصح
    if (loadSession()?.refreshToken === latest.refreshToken) saveSession(next);
    return next;
  });
  return session.accessToken;
}

/** الخروج: الجلسة بتتمسح من الجهاز، والـrefresh token بيتلغي في وصلة كمان */
export function endSession(): void {
  const session = loadSession();
  saveSession(null);
  if (session?.refreshToken) revokeRefreshToken(session.refreshToken);
}
