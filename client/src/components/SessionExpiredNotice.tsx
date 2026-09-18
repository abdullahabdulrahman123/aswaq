import { useAuth } from '../context/AuthContext';

/**
 * جلسة وصلة خلصت ومتجدّدتش. التوكن بيتجدّد لوحده، فده بيظهر بس لو وصلة
 * رفضت التجديد: خروج من تاب تاني، الحساب اتمسح، أو شهر من غير ما يفتح
 * أسواق. اللي معروض لسه صحيح، بس أي حفظ هيترفض لحد ما يسجّل دخول تاني.
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
