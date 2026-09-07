import { useAuth } from '../context/AuthContext';

/**
 * صفحة الحساب في أسواق.
 *
 * أغلب المستخدمين مشترين مش بائعين، فأي كلام عن البيع والنشاط التجاري
 * مبيظهرش غير بعد ما يكون فيه نشاط فعلاً. اللي من غير نشاط بيشوف
 * بياناته وبس — إنشاء النشاط وإدارته بقوا في صفحاتهم من قائمة الحساب.
 */
export function AccountPage() {
  const { user, businesses, signIn } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          صفحة الحساب متاحة بعد تسجيل الدخول.
        </p>
        <button
          onClick={() => signIn('login')}
          className="mt-6 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">حسابي</h1>

      {/* الهوية — من وصلة */}
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-display text-lg font-bold">
              {user.name ?? 'مستخدم'}
              {user.demo && <span className="ms-2 text-sm font-normal text-amber-600 dark:text-amber-400">(تجريبي)</span>}
            </div>
            {user.email && <div className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{user.email}</div>}
            {/* الشارة للشركات بس — المشتري العادي مش محتاج تصنيف */}
            {businesses.length > 0 && (
              <div className="mt-2 inline-block rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                حساب شركة
              </div>
            )}
          </div>

        </div>
        <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-relaxed text-stone-400 dark:border-white/10">
          تعديل بياناتك الشخصية وكلمة السر هيتضاف في مرحلة جاية.
        </p>
      </section>

      {businesses.length > 0 && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">النشاط التجاري</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            عندك {businesses.length} نشاط مسجّل — تلاقيهم في قائمة حسابك فوق.
          </p>
        </section>
      )}

    </div>
  );
}
