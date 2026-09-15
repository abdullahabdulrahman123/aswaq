/**
 * تسجيل الدخول عبر وصلة (Wasla) — تدفّق OIDC Authorization Code + PKCE.
 * نفس النمط المستخدم في cura-pres، معدّل لأن أسواق منشور تحت مسار فرعي.
 *
 * ⚠️ ملاحظة أمنية: الـid_token بيتفك هنا من غير التحقق من التوقيع، وده مقبول
 * لأنه للعرض بس (الاسم والإيميل). أي بيانات بتتحفظ بتروح بتوكن الوصول،
 * ووصلة (أو سيرفر أسواق عن طريق وصلة) هي اللي بتتحقق منه — المتصفح مش
 * مصدر ثقة في أي حاجة.
 */

/**
 * متغيّرات GitHub Actions الغير مضبوطة بتوصل كنص فاضي مش undefined،
 * فالـ?? مش بيشتغل معاها. بنعامل الفاضي كأنه مش موجود.
 */
function envVar(value: unknown): string | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  return v.length > 0 ? v : undefined;
}

const ISSUER = envVar(import.meta.env.VITE_WASLA_ISSUER);
const CLIENT_ID = envVar(import.meta.env.VITE_WASLA_CLIENT_ID) ?? 'aswaq';

/** وصلة متوصّلة فعلاً؟ لو لأ، الواجهة بتشتغل بوضع تجريبي واضح */
export const waslaConfigured = Boolean(ISSUER);

/**
 * واجهة وصلة (صفحات الحساب) على أصل مختلف عن الـissuer:
 * الـissuer هو الـAPI (منفذ 5000) والصفحات على واجهة وصلة (منفذ 5183).
 */
export function waslaAccountUrl(): string {
  const configured = envVar(import.meta.env.VITE_WASLA_ACCOUNT_ORIGIN);
  return (configured ?? 'http://localhost:5183').replace(/\/+$/, '');
}

/**
 * سيرفر وصلة لبيانات النشاط والعناوين: نفس أصل الـissuer من غير /op.
 * محلياً ده بروكسي واجهة وصلة (5183) اللي بيمرّر /api للسيرفر، وعلى النشر
 * ده سيرفر وصلة نفسه — فمفيش متغيّر بيئة جديد يتظبط.
 */
export function waslaApiOrigin(): string {
  if (!ISSUER) throw new Error('VITE_WASLA_ISSUER غير مضبوط');
  return new URL(ISSUER).origin;
}

export interface WaslaUser {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  /** true = جلسة تجريبية مش من وصلة */
  demo?: boolean;
}

/** توكن الوصول — بيتبعت مع أي طلب بيحفظ بيانات */
export interface WaslaSession {
  accessToken: string;
  /** بالمللي ثانية */
  expiresAt: number;
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
}

/** المسار الأساسي بيختلف بين التطوير (/) والنشر (/aswaq/) */
export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}auth/wasla/callback`.replace(
    /([^:]\/)\/+/g,
    '$1',
  );
}

/**
 * يوجّه المتصفح لوصلة. `returnTo` بيتحفظ محلياً عشان نرجّع المستخدم
 * لنفس المكان اللي كان فيه بعد ما يخلّص.
 */
export async function redirectToWasla(returnTo: string, intent: 'login' | 'register'): Promise<void> {
  if (!ISSUER) throw new Error('VITE_WASLA_ISSUER غير مضبوط');

  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

  // localStorage مش sessionStorage: التسجيل الجديد بيمرّ على إيميل تفعيل،
  // والمستخدم غالباً بيفتح اللينك في تاب تاني. sessionStorage محصورة في
  // التاب الواحد فالـstate بيضيع والتحقق بيفشل عند الرجوع.
  // القيم دي مؤقتة ومرة واحدة وبتتمسح فور تبادل الكود.
  localStorage.setItem('aswaq_wasla_verifier', verifier);
  localStorage.setItem('aswaq_wasla_state', state);
  // بنخزّن المسار نسبةً لجذر التطبيق. الراوتر بيضيف البادئة (/aswaq/) لوحده،
  // فلو خزّنّا المسار كامل بيتكرر ويطلع /aswaq/aswaq/.
  const base = import.meta.env.BASE_URL || '/';
  const relative = returnTo.startsWith(base) ? returnTo.slice(base.length - 1) : returnTo;
  localStorage.setItem('aswaq_wasla_return', relative.startsWith('/') ? relative : `/${relative}`);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    /*
     * الخروج من أسواق بيمسح بيانات أسواق بس — جلسة وصلة بتفضل في المتصفح.
     * من غير prompt=login وصلة كانت بتعرف المستخدم وترجّعه على حسابه القديم
     * على طول، حتى لو داس «إنشاء حساب». كده صفحة وصلة بتظهر دايماً، وهي اللي
     * بتعرض «متابعة باسم …» لو الجهاز فاكره.
     */
    prompt: 'login',
    // وصلة بتفتح على فورم الحساب الجديد على طول لما يبقى signup
    screen_hint: intent === 'register' ? 'signup' : 'login',
  });

  window.location.href = `${ISSUER}/auth?${params.toString()}`;
}

/** فيه محاولة تسجيل مبدوءة أصلاً؟ لو لأ يبقى المستخدم وصل هنا من غير ما يبدأ */
export function hasPendingLogin(): boolean {
  return Boolean(localStorage.getItem('aswaq_wasla_state'));
}

export function validateState(state: string | null): boolean {
  const expected = localStorage.getItem('aswaq_wasla_state');
  return Boolean(expected) && expected === state;
}

export function consumeReturnTo(): string {
  const to = localStorage.getItem('aswaq_wasla_return') || '/';
  localStorage.removeItem('aswaq_wasla_return');
  return to;
}

/** وصلة بتدي توكن الوصول ساعة — ده الافتراضي لو الرد مقالش */
const DEFAULT_TOKEN_SECONDS = 3600;

export async function exchangeCode(code: string): Promise<{ idToken: string; session: WaslaSession }> {
  if (!ISSUER) throw new Error('VITE_WASLA_ISSUER غير مضبوط');
  const verifier = localStorage.getItem('aswaq_wasla_verifier') ?? '';

  const res = await fetch(`${ISSUER}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) throw new Error('فشل تبادل رمز التفويض مع وصلة');

  localStorage.removeItem('aswaq_wasla_verifier');
  localStorage.removeItem('aswaq_wasla_state');

  const data = (await res.json()) as { id_token?: string; access_token?: string; expires_in?: number };
  if (!data.id_token || !data.access_token) throw new Error('وصلة مرجّعتش التوكنات المطلوبة');

  return {
    idToken: data.id_token,
    session: {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? DEFAULT_TOKEN_SECONDS) * 1000,
    },
  };
}

/** فك الـpayload بدون تحقق من التوقيع — انظر الملاحظة الأمنية أعلى الملف */
export function decodeIdToken(idToken: string): WaslaUser {
  const payload = idToken.split('.')[1];
  if (!payload) throw new Error('id_token غير صالح');
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const claims = JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  return {
    sub: String(claims.sub ?? ''),
    name: typeof claims.name === 'string' ? claims.name : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    picture: typeof claims.picture === 'string' ? claims.picture : undefined,
  };
}
