import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { categoryById } from '../data/catalog';

/**
 * صفحة الحساب في أسواق.
 *
 * أغلب المستخدمين مشترين مش بائعين، فأي كلام عن البيع والنشاط التجاري
 * مبيظهرش غير بعد ما يكون فيه نشاط فعلاً. اللي من غير نشاط بيشوف
 * بياناته وبس — إنشاء النشاط بقى في قائمة الحساب (AccountMenu).
 */
export function AccountPage() {
  const { user, business, deleteBusiness, signIn } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            {business && (
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

      {business ? (
        /* عنده نشاط — هنا بس بنتكلم عن البيع */
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">النشاط التجاري</h2>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <div className="min-w-0">
              <div className="font-display font-bold">{business.name}</div>
              <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {categoryById(business.category)?.name} · {business.city}
              </div>
              <div className="mt-1 text-xs text-stone-400">
                اتسجّل في {new Date(business.createdAt).toLocaleDateString('ar-EG')}
              </div>
            </div>
            <span className="rounded-md bg-accent-600 px-2 py-1 text-xs font-semibold text-white">نشط</span>
          </div>

          <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-sm leading-relaxed text-stone-600 dark:bg-white/5 dark:text-stone-300">
            حسابك بقى حساب شركة، فبتشوف أسعار الكميات على المنتجات.
            <br />
            <span className="text-stone-400">رفع منتجاتك وإدارة مخزونك هيتضافوا في مرحلة جاية.</span>
          </p>

          <div className="mt-4 border-t border-stone-200 pt-4 dark:border-white/10">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-stone-600 dark:text-stone-300">متأكد إنك عايز تحذف النشاط؟</span>
                <button
                  onClick={() => { deleteBusiness(); setConfirmDelete(false); }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  أيوة، احذف
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium dark:border-white/15"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-stone-400 transition hover:text-red-600">
                حذف النشاط التجاري
              </button>
            )}
          </div>
        </section>
      ) : null}

    </div>
  );
}
