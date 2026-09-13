import { useAuth } from '../context/AuthContext';

/**
 * توكن وصلة انتهى (بيعيش ساعة). اللي معروض لسه صحيح، بس أي حفظ هيترفض
 * لحد ما المستخدم يسجّل دخول تاني — ووصلة غالباً فاكراه فبيرجع على طول.
 */
export function SessionExpiredNotice() {
  const { sessionExpired, signIn } = useAuth();
  if (!sessionExpired) return null;

  return (
    <div
      role="alert"
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-start text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
    >
      <span>جلستك مع وصلة انتهت — سجّل دخول تاني عشان تقدر تحفظ.</span>
      <button
        type="button"
        onClick={() => signIn('login')}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
      >
        سجّل دخول
      </button>
    </div>
  );
}
