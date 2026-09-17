import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { aswaqApiConfigured, deleteItem, fetchItems, type Item, type ItemUnit } from '../lib/aswaqApi';
import { egp } from '../data/catalog';
import { PRICE_FIELDS, PRICE_LABELS, unitKindInfo, unitKindOf } from '../lib/itemUnits';

/**
 * أصناف النشاط المختار — العرض والتعديل والمسح.
 * الإضافة في صفحتها (ItemFormPage)، والاتنين من قائمة ☰.
 */

function UnitLine({ unit }: { unit: ItemUnit }) {
  const values: [label: string, text: string][] = [];
  // أصناف اتحفظت قبل avg ممكن متكونش فيها الحقل خالص، فـ!= null مش !== null
  if (unit.avgCost != null) values.push(['avg', egp(unit.avgCost)]);
  if (unit.rate != null) values.push(['rate', String(unit.rate)]);
  for (const field of PRICE_FIELDS) {
    const price = unit[field];
    if (price !== null) values.push([PRICE_LABELS[field], egp(price)]);
  }

  return (
    <li className="rounded-lg bg-stone-50 px-3 py-2.5 dark:bg-white/5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-semibold">{unit.name}</span>
        <span className="text-xs text-stone-400">
          {unitKindInfo(unitKindOf(unit.kind)).label} ·{' '}
          {unit.unitContent === 1 ? 'أصغر وحدة' : `فيها ${unit.unitContent}`}
        </span>
      </div>

      {values.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {values.map(([label, text]) => (
            <span key={label} className="text-xs text-stone-600 dark:text-stone-300">
              <span className="text-stone-400">{label}</span>{' '}
              <span className="font-medium tabular-nums">{text}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-stone-400">لسه مفيش أسعار</p>
      )}
    </li>
  );
}

export function ItemsPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { state } = useLocation() as { state?: { saved?: string } };
  const { user, businesses, businessesLoading, signIn, withToken } = useAuth();

  /** null = لسه بنجيب */
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const business = businesses.find((b) => b.accountId === accountId);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setError('');
    withToken((token) => fetchItems(token, accountId))
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setItems([]);
        setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب الأصناف.');
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, user, withToken]);

  async function handleDelete(item: Item) {
    setDeletingId(item.id);
    setError('');
    try {
      await withToken((token) => deleteItem(token, accountId, item.id));
      setItems((prev) => (prev ?? []).filter((one) => one.id !== item.id));
      setConfirmingId('');
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        setError(err instanceof ApiError ? err.message : 'مقدرناش نمسح الصنف.');
      }
    } finally {
      setDeletingId('');
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          الأصناف متاحة بعد تسجيل الدخول.
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

  if (!business) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">
          {businessesLoading ? 'بنجيب النشاط…' : 'النشاط ده مش موجود'}
        </h1>
        {!businessesLoading && (
          <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
            يمكن يكون اتحذف، أو تبع حساب تاني.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">الأصناف</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            لنشاط <span className="font-semibold text-stone-700 dark:text-stone-200">{business.name}</span>
          </p>
        </div>
        <Link
          to={`/business/${accountId}/items/new`}
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          + إضافة صنف
        </Link>
      </div>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {!aswaqApiConfigured && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          سيرفر الأصناف مش متوصّل بالنسخة دي، فمش هنعرف نجيب الأصناف.
        </p>
      )}

      {state?.saved && (
        <p role="status" className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-200">
          «{state.saved}» اتحفظ.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">بنجيب الأصناف…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-white/15">
          <p className="text-sm text-stone-500 dark:text-stone-400">لسه مفيش أصناف في النشاط ده.</p>
          <Link
            to={`/business/${accountId}/items/new`}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            ضيف أول صنف ←
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card"
            >
              <div className="flex items-start gap-3">
                {item.picture && (
                  <img src={item.picture} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                )}
                <h2 className="min-w-0 flex-1 font-display text-lg font-bold">{item.name}</h2>
              </div>

              <ul className="mt-4 space-y-2">
                {item.units.map((unit) => (
                  <UnitLine key={unit.name} unit={unit} />
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to={`/business/${accountId}/items/${item.id}/edit`}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
                >
                  تعديل
                </Link>

                {/* تأكيد في المكان بدل نافذة المتصفح — المسح مالوش رجعة */}
                {confirmingId === item.id ? (
                  <>
                    <span className="text-xs text-stone-500 dark:text-stone-400">متأكد؟</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-progress disabled:opacity-70"
                    >
                      {deletingId === item.id ? 'بنمسح…' : 'امسح'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId('')}
                      disabled={deletingId === item.id}
                      className="rounded-lg px-2 py-1.5 text-xs text-stone-500 transition hover:text-stone-700 disabled:opacity-60 dark:text-stone-400"
                    >
                      رجوع
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(item.id)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
                  >
                    مسح
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
