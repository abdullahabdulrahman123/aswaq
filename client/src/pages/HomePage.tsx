import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LocationBar } from '../components/LocationBar';
import { useBuyerLocation } from '../context/LocationContext';
import { fetchDeliveryRadii } from '../lib/aswaqApi';
import { deliversTo, distanceKm, formatDistance } from '../lib/buyerLocation';
import { ApiError, fetchStores, type ShowroomStore } from '../lib/waslaApi';

/**
 * الصفحة الرئيسية — المعرض، بطلب العميل: المتاجر من كل الأنشطة، مش الشركات.
 * كل متجر عليه اسمه واسم نشاطه، ولوجو النشاط أو اختصاره، والدوسة عليه بتفتح
 * أصنافه.
 *
 * لو المشتري حدد مكانه، المتاجر بتترتب من الأقرب، وكل متجر عليه المسافة
 * وبيوصّل لمكانه ولا لأ. المتجر اللي مبيوصّلش بيفضل ظاهر: ينفع يشتري منه
 * ويستلم من عنده. من غير مكان: الأحدث الأول زي ما وصلة بترجّعها.
 */
export function HomePage() {
  const { location } = useBuyerLocation();
  /** null = لسه بنجيب */
  const [stores, setStores] = useState<ShowroomStore[] | null>(null);
  /** نطاق توصيل المتاجر اللي بتوصّل. null = أسواق مردّش — ساعتها مبنقولش حاجة عن التوصيل */
  const [radii, setRadii] = useState<Map<string, number> | null>(null);
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
    fetchDeliveryRadii()
      .then((list) => {
        if (cancelled) return;
        setRadii(new Map(list.flatMap(({ shopId, deliveryRadiusKm }) => (deliveryRadiusKm === null ? [] : [[shopId, deliveryRadiusKm]]))));
      })
      .catch(() => {
        if (!cancelled) setRadii(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // sort ثابت: المتاجر اللي على نفس المسافة بتفضل الأحدث الأول
  const shown = useMemo(() => {
    if (!stores) return null;
    const list = stores.map((store) => ({
      store,
      km: location && store.location ? distanceKm(location, store.location) : null,
    }));
    return location ? list.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity)) : list;
  }, [stores, location]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">المتاجر</h1>

      <div className="mt-4 max-w-xl">
        <LocationBar />
      </div>

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
        ) : shown === null ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">بنجيب المتاجر…</p>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-white/15 dark:text-stone-400">
            لسه مفيش متاجر.
          </p>
        ) : (
          <ul aria-label="المتاجر" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(({ store, km }) => (
              <li key={store.id}>
                <Link
                  to={`/store/${store.id}`}
                  className="flex h-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-400"
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
                    {location && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        {km !== null && (
                          <span className="tabular-nums text-stone-500 dark:text-stone-400">{formatDistance(km)}</span>
                        )}
                        {radii &&
                          (deliversTo(store.location, radii.get(store.id), location) ? (
                            <span className="rounded-md bg-accent-50 px-1.5 py-0.5 font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                              بيوصّل لمكانك
                            </span>
                          ) : (
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-500 dark:bg-white/10 dark:text-stone-400">
                              مبيوصّلش لمكانك
                            </span>
                          ))}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
