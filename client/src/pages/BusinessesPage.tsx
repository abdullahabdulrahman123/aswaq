import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** أنشطة المستخدم التجارية المسجّلة على أسواق */
export function BusinessesPage() {
  const { user, businesses, deleteBusiness, signIn } = useAuth();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          نشاطاتك التجارية متاحة بعد تسجيل الدخول.
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">نشاطاتي التجارية</h1>
        {businesses.length > 0 && (
          <Link
            to="/business/new"
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            أنشئ نشاط جديد
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center dark:border-white/15">
          <p className="text-stone-500 dark:text-stone-400">لسه مسجّلتش أي نشاط تجاري.</p>
          <Link
            to="/business/new"
            className="mt-5 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            أنشئ نشاط تجاري
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {businesses.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-surface-card"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 px-1 font-display text-sm font-bold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
                  <span className="truncate">{b.abbreviation}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{b.name}</div>
                  <div className="mt-0.5 text-xs text-stone-400">
                    اتسجّل في {new Date(b.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>

                {confirmId === b.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        deleteBusiness(b.id);
                        setConfirmId(null);
                      }}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      أيوة، احذف
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium dark:border-white/15"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(b.id)}
                    className="text-xs text-stone-400 transition hover:text-red-600"
                  >
                    حذف
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-stone-400">
        رفع المنتجات وإدارة المخزون لكل نشاط هيتضافوا في مرحلة جاية.
      </p>
    </div>
  );
}
