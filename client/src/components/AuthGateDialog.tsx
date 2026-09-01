import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * نافذة تسجيل الدخول. بتطلع من مكانين:
 *  - زراير "دخول / حساب جديد" في الشريط العلوي
 *  - عند الضغط على "إتمام الطلب" وهو زائر — ساعتها بنقوله ليه محتاجين نعرفه
 */
export function AuthGateDialog() {
  const { gateOpen, gateIntent, closeGate, signIn, connected } = useAuth();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!gateOpen) return;
    primaryRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeGate();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [gateOpen, closeGate]);

  if (!gateOpen) return null;

  const isCheckout = gateIntent === 'login' || gateIntent === 'register';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeGate();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-surface-card">
        <div className="flex items-start justify-between gap-4">
          <h2 id="auth-title" className="font-display text-lg font-bold">
            {gateIntent === 'register' ? 'اعمل حساب جديد' : 'سجّل دخولك'}
          </h2>
          <button onClick={closeGate} aria-label="إغلاق" className="text-stone-400 hover:text-stone-900 dark:hover:text-white">
            ✕
          </button>
        </div>

        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">
          حسابك على أسواق بيتم عن طريق <strong>وصلة</strong> — حساب واحد يفتحلك كل التطبيقات
          المرتبطة بيها. أسواق مبيحفظش كلمة السر عنده.
        </p>

        {isCheckout && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
            محتاجين نعرفك عشان نقدر نبعتلك الطلب ونتابع الشحن معاك.
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button
            ref={primaryRef}
            onClick={() => signIn(gateIntent)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            {gateIntent === 'register' ? 'أنشئ حساب عبر وصلة' : 'سجّل دخول عبر وصلة'}
            <span aria-hidden="true">←</span>
          </button>

          <button
            onClick={() => signIn(gateIntent === 'register' ? 'login' : 'register')}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold transition hover:border-stone-400 dark:border-white/15"
          >
            {gateIntent === 'register' ? 'عندي حساب بالفعل — سجّل دخول' : 'معنديش حساب — اعمل واحد'}
          </button>
        </div>

        {!connected && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <strong>وضع تجريبي:</strong> وصلة مش متوصّلة بالنسخة دي، فالضغط هيفتح جلسة وهمية
            لعرض الشكل بس. في التشغيل الحقيقي الزرار بيوديك على صفحة وصلة.
          </p>
        )}

        <p className="mt-4 text-center text-xs text-stone-400">
          بتسجيلك بتوافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      </div>
    </div>
  );
}
