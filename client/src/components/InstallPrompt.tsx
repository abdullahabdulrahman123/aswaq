import { useEffect, useState } from 'react';

/**
 * إشعار «ثبّت أسواق» — الموقع يتحط أيقونة على سطح المكتب أو شاشة الموبايل
 * ويفتح في شباك لوحده زي أي تطبيق.
 *
 * كروم وإيدج وسامسونج (أندرويد والكمبيوتر) بيبعتوا حدث beforeinstallprompt
 * لما الموقع يستوفي شروط التثبيت. بنمسكه ونعرض إشعارنا احنا بزرار «تثبيت»،
 * بدل الشريط الافتراضي بتاع المتصفح اللي بيظهر في وقت عشوائي.
 *
 * الآيفون مبيبعتش الحدث ده خالص، ومفيش طريقة نثبّت من الكود، فبنعرض
 * الخطوات بدل الزرار.
 */

/** مش موجود في أنواع TypeScript القياسية لسه */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'aswaq_install_dismissed_at';
/** بعد «مش دلوقتي» منرجعش نسأل قبل أسبوعين */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** على الآيفون مفيش حدث يقولنا الوقت مناسب، فبنسيب الزائر يشوف الموقع الأول */
const IOS_DELAY_MS = 8000;

/*
 * الحدث ممكن ييجي قبل ما React يركّب الإشعار، فبنسمعه من أول ما الملف
 * يتحمّل ونحتفظ بيه لحد ما الكومبوننت يحتاجه.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (event) => {
  // من غير preventDefault كروم على أندرويد بيعرض شريطه هو كمان
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installed = true;
  notify();
});

/** مفتوح أصلاً كتطبيق مثبّت — مفيش داعي نعرض حاجة */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * آيفون أو آيباد. الآيباد الجديد بيقدّم نفسه كـMac، فبنفرّقه بشاشة اللمس.
 * من iOS 16.4 كروم وفايرفوكس على الآيفون بيضيفوا للشاشة الرئيسية بنفس
 * الطريقة، فمش بنحصرها في سفاري.
 */
function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** أيقونة زرار المشاركة في سفاري — مربع طالع منه سهم */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block align-[-3px]"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState(deferredPrompt);
  const [hidden, setHidden] = useState(() => installed || isStandalone() || recentlyDismissed());
  const [iosReady, setIosReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPrompt(deferredPrompt);
      if (installed) setHidden(true);
    };
    subscribers.add(sync);
    sync();

    const timer = isIOS() ? window.setTimeout(() => setIosReady(true), IOS_DELAY_MS) : undefined;
    return () => {
      subscribers.delete(sync);
      window.clearTimeout(timer);
    };
  }, []);

  function snooze() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // التخزين مقفول — هيسأل تاني الزيارة الجاية، مش مشكلة
    }
    setHidden(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // الحدث بيتستخدم مرة واحدة بس، والمتصفح بيبعت غيره لو احتاج
    deferredPrompt = null;
    notify();
    if (outcome === 'dismissed') snooze();
  }

  const showInstall = Boolean(prompt) && !hidden;
  const showIOSSteps = iosReady && !prompt && !hidden;
  if (!showInstall && !showIOSSteps) return null;

  return (
    <>
      {/*
        الإشعار ثابت في آخر الشاشة، فكان بيقعد فوق آخر حاجة في الصفحة —
        زرار «احفظ الصنف» مثلاً كان تحته والضغط بيروح للإشعار.
        المساحة دي بتخلي الصفحة تنزل تحته.
      */}
      <div aria-hidden="true" className="h-44 shrink-0 sm:h-40" />
      <aside
        aria-label="تثبيت أسواق"
        className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-white/10 dark:bg-surface-card sm:inset-x-auto sm:bottom-4 sm:end-4 sm:w-96"
      >
        <div className="flex items-start gap-3">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-bold">ثبّت أسواق على جهازك</h2>
            {showInstall ? (
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                افتحه من سطح المكتب أو شاشة التطبيقات زي أي تطبيق — من غير متجر ومن غير ما يشيل مساحة.
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                دوس على زرار المشاركة <ShareIcon /> في المتصفح، وبعدين اختار
                «إضافة إلى الشاشة الرئيسية».
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={snooze}
            className="rounded-lg px-3 py-2 text-xs font-medium text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            {showInstall ? 'مش دلوقتي' : 'تمام'}
          </button>
          {showInstall && (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              تثبيت
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
