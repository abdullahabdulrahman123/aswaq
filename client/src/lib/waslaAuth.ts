/**
 * تسجيل الدخول عبر وصلة (Wasla) — تدفّق OIDC Authorization Code + PKCE.
 * نفس النمط المستخدم في cura-pres، معدّل لأن أسواق منشور تحت مسار فرعي.
 *
 * ⚠️ ملاحظة أمنية: أسواق لسه من غير سيرفر، فالـ id_token بيتفك هنا من غير
 * التحقق من التوقيع. ده مقبول دلوقتي لأن مفيش حاجة محمية على المتصفح أصلاً.
 * ساعة ما نبني الـbackend لازم الـtoken يتبعتله ويتحقق من التوقيع عبر JWKS
 * قبل إنشاء أي طلب.
 */

const ISSUER = import.meta.env.VITE_WASLA_ISSUER as string | undefined;
const CLIENT_ID = (import.meta.env.VITE_WASLA_CLIENT_ID as string | undefined) ?? 'aswaq';

/** وصلة متوصّلة فعلاً؟ لو لأ، الواجهة بتشتغل بوضع تجريبي واضح */
export const waslaConfigured = Boolean(ISSUER);

export interface WaslaUser {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  /** true = جلسة تجريبية مش من وصلة */
  demo?: boolean;
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
 * يوجّه المتصفح لوصلة. `intent` بيتحفظ محلياً عشان نرجّع المستخدم
 * لنفس المكان اللي كان فيه بعد ما يخلّص.
 */
export async function redirectToWasla(returnTo: string): Promise<void> {
  if (!ISSUER) throw new Error('VITE_WASLA_ISSUER غير مضبوط');

  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

  sessionStorage.setItem('aswaq_wasla_verifier', verifier);
  sessionStorage.setItem('aswaq_wasla_state', state);
  sessionStorage.setItem('aswaq_wasla_return', returnTo);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.href = `${ISSUER}/auth?${params.toString()}`;
}

export function validateState(state: string | null): boolean {
  const expected = sessionStorage.getItem('aswaq_wasla_state');
  return Boolean(expected) && expected === state;
}

export function consumeReturnTo(): string {
  return sessionStorage.getItem('aswaq_wasla_return') || '/';
}

export async function exchangeCode(code: string): Promise<string> {
  if (!ISSUER) throw new Error('VITE_WASLA_ISSUER غير مضبوط');
  const verifier = sessionStorage.getItem('aswaq_wasla_verifier') ?? '';

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

  sessionStorage.removeItem('aswaq_wasla_verifier');
  sessionStorage.removeItem('aswaq_wasla_state');

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error('وصلة لم ترجع id_token');
  return data.id_token;
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
