import { ORIGIN } from './aswaqApi';

/**
 * بيبعت الخطأ لسيرفر أسواق (POST /api/errors، فحص ٦ أكتوبر) — بيتقري بـ`npm run
 * errors`. ٥ بالكتير في الفتحة الواحدة، ونفس الرسالة مرة واحدة: صفحة بتقع في
 * لفة متملاش السجل. ولو السيرفر مش متاح بيتنسي — التسجيل ميوقّعش حاجة.
 */
const MAX_REPORTS = 5;
const sent = new Set<string>();
/** رسايل المتصفح نفسه مش غلطة عندنا */
const IGNORED = [/ResizeObserver loop/];

/** نسخة الموقع: الـhash اللي في اسم ملف الـbuild — عشان نعرف الخطأ قبل التصليح ولا بعده */
function buildVersion(): string {
  const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="index-"]')?.src ?? '';
  return /index-([\w-]+)\.js/.exec(src)?.[1] ?? 'dev';
}

export function reportError(error: unknown, extra?: string | null) {
  if (!ORIGIN) return;
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : String(error));
  const message = err.message || err.name;
  if (IGNORED.some((re) => re.test(message)) || sent.size >= MAX_REPORTS || sent.has(message)) return;
  sent.add(message);
  let userId: string | undefined;
  try {
    userId = JSON.parse(localStorage.getItem('aswaq_user') ?? 'null')?.sub;
  } catch {
    // من غير المستخدم
  }
  void fetch(`${ORIGIN}/api/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      message,
      stack: [err.stack, extra].filter(Boolean).join('\n--\n') || undefined,
      where: window.location.pathname + window.location.search,
      userId,
      version: buildVersion(),
    }),
  }).catch(() => undefined);
}

/** الأخطاء اللي ملهاش حد يمسكها — في الكود أو في وعد (promise) اترفض */
export function watchErrors() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
}
