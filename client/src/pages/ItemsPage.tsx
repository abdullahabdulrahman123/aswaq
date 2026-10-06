import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { aswaqApiConfigured, deleteItem, fetchItems, putUnitVisibility, type Item, type ItemUnit } from '../lib/aswaqApi';
import { PRICE_FIELDS, PRICE_LABELS, soldIn, type PriceField } from '../lib/itemUnits';

/** بالقرش ← «7.5» — العمود عنوانه فوق، فمن غير «ج.م» */
const price = (piasters: number | null) => (piasters === null ? '—' : (piasters / 100).toLocaleString('en-EG', { maximumFractionDigits: 2 }));

/** الصنف اللي اتفتح للتعديل — الرجوع (حفظ أو رجوع المتصفح) بينزل عليه */
const RETURN_KEY = 'aswaq_items_return';

/**
 * أصناف النشاط المختار — العرض والتعديل والمسح.
 * الإضافة في صفحتها (ItemFormPage)، والاتنين من قائمة ☰.
 *
 * رسالة العميل ٦ أكتوبر: الكارت أقصر عشان أصناف أكتر تبان — سطر لكل وحدة فيه اسمها
 * والأربع أسعار جنب بعض، وفوقهم سطر صغير بأسامي الأسعار. التعديل والمسح أيقونتين.
 * وبعد «حفظ» (أو الرجوع) الليستة بتنزل على الصنف اللي كان بيتعدّل بدل أولها.
 *
 * مكالمة ٦ أكتوبر: تحت كل سعر تشيك — الوحدة بتتباع في المنفذ ده ولا لأ (الأربع أسعار
 * = أربع منافذ: جملة وقطاعي، محل وأونلاين). وتحت اسم الوحدة «الكل» للأربعة مرة واحدة.
 * التشيك بيتحفظ أول ما يتداس، والمعرض و«مبيعات» بيخفوا الوحدة في المنفذ المقفول.
 */

export function ItemsPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { state } = useLocation() as { state?: { saved?: string; itemId?: string } };
  const { user, businesses, businessesLoading, signIn, withToken, sessionExpired } = useAuth();

  /** null = لسه بنجيب */
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const business = businesses.find((b) => b.accountId === accountId);
  /** الصنف اللي رجعنا عليه — بيتعلّم ثانيتين */
  const [returnedId, setReturnedId] = useState('');
  const returned = useRef(false);

  // الرجوع من التعديل: على نفس الصنف — مرة واحدة، مش مع كل مسح بعدها
  useEffect(() => {
    if (!items?.length || returned.current) return;
    returned.current = true;
    let target = state?.itemId ?? '';
    try {
      target ||= sessionStorage.getItem(RETURN_KEY) ?? '';
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      // من غير تخزين: من أول الليستة
    }
    if (!target || !items.some((i) => i.id === target)) return;
    requestAnimationFrame(() => document.querySelector(`[data-item="${target}"]`)?.scrollIntoView({ block: 'center' }));
    setReturnedId(target);
    const timer = setTimeout(() => setReturnedId(''), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // الجلسة خلصت؟ بنستنى لحد ما يسجّل دخول (هنا أو في شباك تاني) ونجيبها ساعتها
  useEffect(() => {
    if (!user || sessionExpired) return;
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
  }, [accountId, user, withToken, sessionExpired]);

  /** حفظ التشيكات بالترتيب — دوستين ورا بعض ميوصلوش بالعكس */
  const visibilitySaves = useRef(Promise.resolve());

  /** التشيكات الجديدة لوحدة: بتظهر على طول، ولو الحفظ فشل بترجع زي ما كانت */
  function setHiddenIn(item: Item, unit: ItemUnit, hiddenIn: PriceField[]) {
    const before = unit.hiddenIn ?? [];
    const apply = (next: PriceField[]) =>
      setItems((prev) =>
        (prev ?? []).map((one) =>
          one.id === item.id ? { ...one, units: one.units.map((u) => (u.name === unit.name ? { ...u, hiddenIn: next } : u)) } : one,
        ),
      );
    apply(hiddenIn);
    setError('');
    visibilitySaves.current = visibilitySaves.current.then(async () => {
      try {
        await withToken((token) => putUnitVisibility(token, accountId, item.id, unit.name, hiddenIn));
      } catch (err) {
        apply(before);
        if (!(err instanceof SessionExpiredError)) setError('مقدرناش نحفظ التشيك. جرّب تاني.');
      }
    });
  }

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
        <p className="mt-3 leading-relaxed text-gray-500 dark:text-gray-400">
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
          <p className="mt-3 leading-relaxed text-gray-500 dark:text-gray-400">
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            لنشاط <span className="font-semibold text-gray-700 dark:text-gray-200">{business.name}</span>
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
        // تنبيه الجلسة فوق كفاية — «بنجيب» هنا كانت هتفضل ظاهرة على الفاضي
        !sessionExpired && <p className="text-sm text-gray-500 dark:text-gray-400">بنجيب الأصناف…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-white/15">
          <p className="text-sm text-gray-500 dark:text-gray-400">لسه مفيش أصناف في النشاط ده.</p>
          <Link
            to={`/business/${accountId}/items/new`}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            ضيف أول صنف ←
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              data-item={item.id}
              className={`rounded-xl border bg-white px-3 py-2 transition-shadow dark:bg-surface-card ${
                returnedId === item.id ? 'border-brand-400 ring-2 ring-brand-300 dark:ring-brand-500/50' : 'border-gray-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.picture && <img src={item.picture} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
                <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">{item.name}</h2>

                {/* تأكيد في المكان بدل نافذة المتصفح — المسح مالوش رجعة */}
                {confirmingId === item.id ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">متأكد؟</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-progress disabled:opacity-70"
                    >
                      {deletingId === item.id ? 'بنمسح…' : 'امسح'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId('')}
                      disabled={deletingId === item.id}
                      className="rounded-lg px-1.5 py-1 text-xs text-gray-500 transition hover:text-gray-700 disabled:opacity-60 dark:text-gray-400"
                    >
                      رجوع
                    </button>
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    <Link
                      to={`/business/${accountId}/items/${item.id}/edit`}
                      aria-label={`تعديل ${item.name}`}
                      title="تعديل"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(RETURN_KEY, item.id);
                        } catch {
                          // من غير تخزين: الرجوع على أول الليستة
                        }
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-brand-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-brand-400"
                    >
                      <PencilIcon />
                    </Link>
                    <button
                      type="button"
                      aria-label={`مسح ${item.name}`}
                      title="مسح"
                      onClick={() => setConfirmingId(item.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                )}
              </div>

              {item.units.length > 0 ? (
                <table className="mt-1 w-full table-fixed text-sm tabular-nums">
                  <thead>
                    <tr className="text-[10px] leading-tight text-gray-400">
                      <th className="w-[22%] pb-0.5 text-start font-normal">الوحدة</th>
                      {PRICE_FIELDS.map((field) => (
                        <th key={field} className="pb-0.5 text-center font-normal">
                          {PRICE_LABELS[field]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {item.units.map((unit) => {
                    const hidden = unit.hiddenIn ?? [];
                    return (
                      <tbody key={unit.name} data-unit={unit.name}>
                        <tr>
                          <td className="truncate pt-0.5 text-start font-semibold">{unit.name}</td>
                          {PRICE_FIELDS.map((field) => (
                            <td
                              key={field}
                              className={`pt-0.5 text-center transition ${
                                unit[field] === null ? 'text-gray-300 dark:text-gray-600' : ''
                              } ${soldIn(unit, field) ? '' : 'text-gray-300 line-through dark:text-gray-600'}`}
                            >
                              {price(unit[field])}
                            </td>
                          ))}
                        </tr>
                        {/* تشيك تحت كل سعر = الوحدة بتتباع في المنفذ ده، و«الكل» تحت اسمها للأربعة */}
                        <tr data-checks>
                          <td className="pb-1 text-start">
                            <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <AllCheck
                                label={`${item.name} — ${unit.name}: الكل`}
                                checked={hidden.length === 0}
                                mixed={hidden.length > 0 && hidden.length < PRICE_FIELDS.length}
                                onChange={(all) => setHiddenIn(item, unit, all ? [] : [...PRICE_FIELDS])}
                              />
                              الكل
                            </label>
                          </td>
                          {PRICE_FIELDS.map((field) => (
                            <td key={field} className="pb-1 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${item.name} — ${unit.name}: ${PRICE_LABELS[field]}`}
                                checked={soldIn(unit, field)}
                                onChange={(e) =>
                                  setHiddenIn(item, unit, e.target.checked ? hidden.filter((k) => k !== field) : [...hidden, field])
                                }
                                className="h-4 w-4 cursor-pointer accent-brand-600 align-middle"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    );
                  })}
                </table>
              ) : (
                <p className="mt-1 text-xs text-gray-400">لسه مفيش وحدات</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** «الكل» — متعلّم لو الأربعة متعلّمين، ونص نص (indeterminate) لو بعضهم */
function AllCheck({ label, checked, mixed, onChange }: { label: string; checked: boolean; mixed: boolean; onChange: (all: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-brand-600"
    />
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}
