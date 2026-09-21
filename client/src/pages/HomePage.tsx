import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { ApiError, fetchStores, type ShowroomStore } from '../lib/waslaApi';

/**
 * الصفحة الرئيسية — المعرض. أول خطوة بطلب العميل: المتاجر من كل الأنشطة، مش
 * الشركات. كل متجر عليه اسمه واسم نشاطه، ولوجو النشاط أو اختصاره.
 *
 * الدوسة على المتجر لسه مبتفتحش حاجة: كروت الأصناف مستنية مراجعة مع العميل.
 * والترتيب بالموقع لسه — دلوقتي الأحدث الأول زي ما وصلة بترجّعها.
 */
export function HomePage() {
  /** null = لسه بنجيب */
  const [stores, setStores] = useState<ShowroomStore[] | null>(null);
  const [error, setError] = useState('');
  /** بيزيد مع «جرّب تاني» عشان الطلب يتعاد */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setError('');
    setStores(null);
    fetchStores()
      .then((list) => {
        if (!cancelled) setStores(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب المتاجر.');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">المتاجر</h1>

      <div className="mt-6">
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="font-semibold underline-offset-2 hover:underline"
            >
              جرّب تاني
            </button>
          </div>
        ) : stores === null ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">بنجيب المتاجر…</p>
        ) : stores.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-white/15 dark:text-stone-400">
            لسه مفيش متاجر.
          </p>
        ) : (
          <ul aria-label="المتاجر" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <li
                key={store.id}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-surface-card"
              >
                <Avatar
                  picture={store.business.picture}
                  fallback={store.business.abbreviation}
                  kind="business"
                  size={48}
                  tone="soft"
                />
                <div className="min-w-0">
                  <h2 className="break-words font-display font-bold leading-snug">{store.name}</h2>
                  <p className="mt-0.5 break-words text-sm text-stone-500 dark:text-stone-400">
                    {store.business.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
