import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LocationBar } from '../components/LocationBar';
import { StoreItemCard } from '../components/StoreItemCard';
import { useAuth } from '../context/AuthContext';
import { useBuyerLocation } from '../context/LocationContext';
import { useSales } from '../context/SalesContext';
import { useCurrentSeller } from '../context/SellerContext';
import { useCartFocus, useStoreCart } from '../context/StoreCartContext';
import { fetchShowroomStore, type ShowroomStoreDetails } from '../lib/aswaqApi';
import { deliversTo, distanceKm, formatDistance } from '../lib/buyerLocation';
import { buyerPriceField, type ReceivingMethod } from '../lib/itemUnits';
import { useDraftSync } from '../lib/draftSync';
import { ApiError, fetchStore, type ShowroomStore } from '../lib/waslaApi';

const METHODS: { key: ReceivingMethod; label: string }[] = [
  { key: 'pickup', label: 'استلام من المتجر' },
  { key: 'delivery', label: 'توصيل' },
];

/**
 * صفحة المتجر في المعرض: أصنافه ككروت (StoreItemCard). فوق الكروت المشتري
 * بيختار طريقة الاستلام — استلام من المتجر أو توصيل — والأسعار كلها بتمشي
 * عليها، بطلب العميل. التوصيل متاح بس لو مكان المشتري جوه نطاق المتجر.
 *
 * المتجر نفسه (اسمه ونشاطه ومكانه) من وصلة، ونطاقه وأصنافه من أسواق.
 *
 * في «مبيعات» الأسعار بتاعة المشتري (شركة = جملة، مستخدم = قطاعي) وطريقة
 * الاستلام اللي اتختارت في نافذة «مبيعات» — مكتوبة بس، من غير اختيار ولا نطاق.
 * متجر نشاط تاني مش جزء من البيعة، فدخوله خروج منها.
 */
export function StorePage() {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const { accountType: myAccountType } = useAuth();
  const { session, leave } = useSales();
  const { location: myLocation } = useBuyerLocation();
  const location = session ? null : myLocation;
  const accountType = session ? (session.buyer.kind === 'business' ? 'COMPANY' : 'INDIVIDUAL') : myAccountType;

  const { repriceStore, linesOf } = useStoreCart();
  const [store, setStore] = useState<ShowroomStore | null>(null);
  const [details, setDetails] = useState<ShowroomStoreDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  /** بيزيد مع «جرّب تاني» عشان الطلب يتعاد */
  const [attempt, setAttempt] = useState(0);
  /** اللي المشتري اختاره. null = لسه مختارش: توصيل لو المتجر بيوصّله، وإلا استلام */
  const [chosen, setChosen] = useState<ReceivingMethod | null>(null);
  /** داس «توصيل» ومكانه مش متحدد — بنقوله يحدده الأول */
  const [askedForLocation, setAskedForLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStore(null);
    setDetails(null);
    setNotFound(false);
    setError('');
    setChosen(null);
    setAskedForLocation(false);

    Promise.allSettled([fetchStore(storeId), fetchShowroomStore(storeId)]).then(([fromWasla, fromAswaq]) => {
      if (cancelled) return;
      if (fromWasla.status === 'rejected') {
        const err = fromWasla.reason;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب المتجر.');
        return;
      }
      if (fromAswaq.status === 'rejected') {
        const err = fromAswaq.reason;
        setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب أصناف المتجر.');
        return;
      }
      setStore(fromWasla.value);
      setDetails(fromAswaq.value);
    });

    return () => {
      cancelled = true;
    };
  }, [storeId, attempt]);

  const otherBusiness = Boolean(session && store && store.business.accountId !== session.accountId);
  useEffect(() => {
    if (otherBusiness) leave();
  }, [otherBusiness, leave]);

  // صورة النشاط على شمال الناڤبار — «البائع» قصاد المشتري
  useCurrentSeller(
    store && {
      id: store.business.accountId,
      name: store.business.name,
      picture: store.business.picture,
      initials: store.business.abbreviation,
      href: `/store/${store.id}`,
    },
  );

  const radius = details?.deliveryRadiusKm ?? null;
  const km = location && store?.location ? distanceKm(location, store.location) : null;
  const canDeliver = deliversTo(store?.location ?? null, radius, location);
  const method: ReceivingMethod = session
    ? session.method
    : chosen === 'delivery' && !canDeliver
      ? 'pickup'
      : (chosen ?? (canDeliver ? 'delivery' : 'pickup'));
  const priceField = buyerPriceField(method, accountType);
  /** الحد الأدنى للأوردر في الشريحة اللي المشتري شايفها — السلة بتلوّن بيه */
  const minimum = details?.minimums[priceField] ?? null;
  /**
   * المتجر بيوصّل بس مكان المشتري مش متحدد: «توصيل» مش مقفول، والدوسة عليه
   * بتقول «حدد موقعك الأول» — بطلب المستخدم. ولما يحدده والمتجر بيوصّله،
   * التوصيل بيتختار لوحده (chosen = توصيل).
   */
  const needsLocation = radius !== null && !location;

  // السلة اللي في الناڤبار تخص المتجر ده، بلون حسب حده الأدنى
  useCartFocus(store?.id ?? null, minimum);

  // المسودة على السيرفر مع كل تغيير في سلة المتجر ده
  useDraftSync(store?.id ?? null, store ? linesOf(store.id) : [], method);

  // الأسعار بتتغيّر مع طريقة الاستلام ونوع الحساب — سطور السلة بتمشي معاها
  useEffect(() => {
    if (!details) return;
    const prices = new Map(
      details.items.flatMap((item) => item.units.map((u) => [`${item.id}|${u.name}`, u[priceField] ?? null] as const)),
    );
    repriceStore(storeId, (itemId, unitName) => prices.get(`${itemId}|${unitName}`));
  }, [details, priceField, storeId, repriceStore]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">المتجر ده مش موجود</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          يمكن يكون اتقفل، أو صاحبه خلاه مخزن بس.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          ارجع للمتاجر
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
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
      </div>
    );
  }

  if (!store || !details) {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-500 dark:text-stone-400">بنجيب المتجر…</p>;
  }

  /** ليه التوصيل مقفول — بيظهر تحت الاختيار */
  const noDeliveryReason =
    radius === null
      ? 'المتجر ده مبيوصّلش — الاستلام منه بس.'
      : km === null
        ? 'مكان المتجر مش متحدد، فمش هنقدر نعرف بيوصّلك ولا لأ.'
        : `المتجر بيوصّل لحد ${formatDistance(radius)}، ومكانك على بعد ${formatDistance(km)}.`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Avatar picture={store.business.picture} fallback={store.business.abbreviation} kind="business" size={56} tone="soft" />
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold leading-tight sm:text-3xl">{store.name}</h1>
          <p className="mt-0.5 break-words text-sm text-stone-500 dark:text-stone-400">
            {store.business.name}
            {km !== null && <span className="tabular-nums"> · {formatDistance(km)}</span>}
          </p>
        </div>
      </div>

      {/* في «مبيعات» طريقة الاستلام مكتوبة بس. وإلا: مش grid — عنصر الـgrid بيكبر على قد النص، فالعنوان الطويل في شريط المكان كان بيوسّع الصفحة بدل ما يتقص */}
      {session ? (
        <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-sm leading-relaxed dark:bg-white/5 sm:max-w-xl">
          <span className="font-semibold">{session.method === 'delivery' ? 'توصيل' : 'استلام من المتجر'}</span>
          {session.method === 'delivery' && <span className="break-words"> — {session.address}</span>}
        </p>
      ) : (
        <div className="mt-5 space-y-3 sm:max-w-xl">
          <LocationBar prompt="حدد مكانك عشان نعرف المتجر بعيد عنك قد إيه" />

          <div>
            <div
              role="radiogroup"
              aria-label="طريقة الاستلام"
              className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5"
            >
              {METHODS.map(({ key, label }) => {
                const picked = method === key;
                const unavailable = key === 'delivery' && !canDeliver && !needsLocation;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    disabled={unavailable}
                    onClick={() => {
                      if (key === 'delivery' && needsLocation) setAskedForLocation(true);
                      setChosen(key);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      picked
                        ? 'bg-white text-brand-800 shadow-sm dark:bg-surface-card dark:text-brand-200'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {needsLocation ? (
              askedForLocation && (
                <p role="alert" className="mt-1.5 text-xs font-semibold leading-relaxed text-brand-700 dark:text-brand-300">
                  حدد موقعك الأول
                </p>
              )
            ) : (
              !canDeliver && <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{noDeliveryReason}</p>
      )}
        </div>
      </div>
      )}

      <div className="mt-6">
        {details.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-white/15 dark:text-stone-400">
            لسه مفيش أصناف في المتجر ده.
          </p>
        ) : (
          <ul aria-label="أصناف المتجر" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {details.items.map((item) => (
              <StoreItemCard key={item.id} item={item} priceField={priceField} shopId={store.id} storeName={store.name} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
