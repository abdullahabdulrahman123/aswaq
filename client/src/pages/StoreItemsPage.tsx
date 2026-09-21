import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { fieldClass, Notch } from '../components/OutlinedField';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import {
  aswaqApiConfigured,
  deleteItem,
  fetchItemsForStore,
  fetchStoreItems,
  postStoreItem,
  type Item,
} from '../lib/aswaqApi';
import { useDropdown } from '../lib/useDropdown';

/**
 * إدارة أصناف المتاجر — بطلب العميل: اختار متجر، اختار صنف من أصناف النشاط،
 * ودوس إضافة. اللي تحت ليستة أصناف المتجر للعرض.
 *
 * الصنف بيتضاف للمتجر كنسخة مستقلة (السيرفر بينسخه)، عشان السعر ومعدل البيع
 * بيختلفوا من فرع لفرع. والأصناف اللي اتضافت خلاص مبتظهرش في كومبو الاختيار.
 */

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, 'ar');

/** صورة الصنف، وأول حرف من اسمه لو لسه مرفعش صورة — زي شارة النشاط لما ملهوش لوجو */
function ItemThumb({ item, size }: { item: Item; size: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg text-xs' : 'h-11 w-11 rounded-xl text-sm';
  if (item.picture) {
    return <img src={item.picture} alt="" className={`${box} shrink-0 object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center bg-stone-100 font-bold text-stone-400 dark:bg-white/10 dark:text-stone-500`}
    >
      {item.name.trim().charAt(0)}
    </span>
  );
}

/** كومبو بسيرش — أصناف النشاط ممكن تكون ٥٠٠ صنف، فليستة مفرودة مش هتنفع */
function ItemCombo({
  items,
  pickedId,
  onPick,
  disabled,
}: {
  items: Item[] | null;
  pickedId: string;
  onPick: (itemId: string) => void;
  disabled: boolean;
}) {
  const { open, setOpen, wrapRef, close } = useDropdown();
  const [query, setQuery] = useState('');

  const picked = items?.find((item) => item.id === pickedId) ?? null;
  const shown = useMemo(() => {
    const text = query.trim();
    if (!text) return items ?? [];
    return (items ?? []).filter((item) => item.name.includes(text));
  }, [items, query]);

  // القايمة بتقفل وهي فيها بحث قديم — الفتحة الجاية تبدأ من الأول
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled || items === null}
        onClick={() => setOpen(!open)}
        className={`${fieldClass} peer flex items-center justify-between gap-2 text-start disabled:cursor-not-allowed disabled:text-stone-400`}
      >
        <span className={`min-w-0 truncate ${picked ? '' : 'text-stone-400'}`}>
          {items === null ? 'بنجيب الأصناف…' : (picked?.name ?? 'اختار صنف')}
        </span>
        <span aria-hidden className="shrink-0 text-xs text-stone-400">▾</span>
      </button>
      <Notch active={open}>الصنف</Notch>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-white/10 dark:bg-surface-card">
          <div className="border-b border-stone-100 p-2 dark:border-white/10">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="دوّر على صنف"
              className="w-full rounded-lg bg-stone-50 px-3 py-2 text-sm outline-none placeholder:text-stone-400 dark:bg-white/5"
            />
          </div>

          <ul aria-label="اختيار صنف" className="max-h-64 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-stone-500 dark:text-stone-400">
                {(items ?? []).length === 0 ? 'كل أصناف النشاط متضافة للمتجر ده.' : 'مفيش صنف بالاسم ده.'}
              </li>
            ) : (
              shown.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item.id);
                      close();
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5 ${
                      item.id === pickedId ? 'font-semibold text-brand-700 dark:text-brand-400' : ''
                    }`}
                  >
                    <ItemThumb item={item} size="sm" />
                    <span className="min-w-0 truncate">{item.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StoreItemsPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, signIn, withToken, sessionExpired } = useAuth();

  const [shopId, setShopId] = useState('');
  /** null = لسه بنجيب */
  const [items, setItems] = useState<Item[] | null>(null);
  const [available, setAvailable] = useState<Item[] | null>(null);
  const [pickedId, setPickedId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState('');
  const [removingId, setRemovingId] = useState('');

  const business = businesses.find((b) => b.accountId === accountId);
  const stores = useMemo(
    () => (business?.premises ?? []).filter((premises) => premises.isStore),
    [business],
  );

  // أول متجر مختار من نفسه. ولو المتجر اتمسح أو اتغيّر النشاط بنرجع لأول واحد
  useEffect(() => {
    if (stores.length === 0) {
      setShopId('');
    } else if (!stores.some((store) => store.id === shopId)) {
      setShopId(stores[0].id);
    }
  }, [stores, shopId]);

  // الجلسة خلصت؟ بنستنى لحد ما يسجّل دخول (هنا أو في شباك تاني) ونجيبها ساعتها
  useEffect(() => {
    if (!user || sessionExpired || !shopId) return;
    let cancelled = false;

    setError('');
    setItems(null);
    setAvailable(null);
    setPickedId('');
    setConfirmingId('');

    withToken(async (token) => ({
      inStore: await fetchStoreItems(token, accountId, shopId),
      forStore: await fetchItemsForStore(token, accountId, shopId),
    }))
      .then(({ inStore, forStore }) => {
        if (cancelled) return;
        setItems(inStore);
        setAvailable(forStore);
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setItems([]);
        setAvailable([]);
        setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب أصناف المتجر.');
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, shopId, user, withToken, sessionExpired]);

  async function handleAdd() {
    if (!pickedId || !shopId) return;
    setAdding(true);
    setError('');
    try {
      const added = await withToken((token) => postStoreItem(token, accountId, shopId, pickedId));
      setItems((prev) => [...(prev ?? []), added].sort(byName));
      setAvailable((prev) => (prev ?? []).filter((item) => item.id !== pickedId));
      setPickedId('');
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (err instanceof ApiError && err.status === 409) {
        setAvailable((prev) => (prev ?? []).filter((item) => item.id !== pickedId));
        setPickedId('');
        setError('الصنف ده متضاف للمتجر ده قبل كده.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'مقدرناش نضيف الصنف للمتجر.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(item: Item) {
    setRemovingId(item.id);
    setError('');
    try {
      await withToken((token) => deleteItem(token, accountId, item.id));
      setItems((prev) => (prev ?? []).filter((one) => one.id !== item.id));
      // رجع للكومبو تاني: بقى ينفع يتضاف من جديد
      setAvailable((prev) => [...(prev ?? []), item].sort(byName));
      setConfirmingId('');
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) {
        setError(err instanceof ApiError ? err.message : 'مقدرناش نشيل الصنف من المتجر.');
      }
    } finally {
      setRemovingId('');
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          أصناف المتاجر متاحة بعد تسجيل الدخول.
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
      <h1 className="font-display text-2xl font-bold sm:text-3xl">إدارة أصناف المتاجر</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        لنشاط <span className="font-semibold text-stone-700 dark:text-stone-200">{business.name}</span>
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {!aswaqApiConfigured && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          سيرفر الأصناف مش متوصّل بالنسخة دي، فمش هنعرف نجيب أصناف المتاجر.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-white/15">
          <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            مفيش متاجر في النشاط ده. ضيف مقر وعلّم عليه «متجر» الأول.
          </p>
          <Link
            to={`/business/${accountId}`}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            روح لبيانات الشركة ←
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            {/* gap أوسع من العادي: اسم كل خانة طالع فوق حدّها بـ٨ بكسل */}
            <div className="grid gap-5">
              <label className="relative block">
                <select
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className={fieldClass}
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <Notch>المتجر</Notch>
              </label>

              <ItemCombo
                items={available}
                pickedId={pickedId}
                onPick={setPickedId}
                disabled={adding || !shopId}
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!pickedId || adding}
              className="mt-5 w-full rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? 'بنضيف…' : 'إضافة'}
            </button>
          </div>

          <h2 className="mt-8 font-display text-lg font-bold">
            أصناف المتجر{' '}
            {items !== null && <span className="text-sm font-normal text-stone-400">{items.length}</span>}
          </h2>

          {items === null ? (
            !sessionExpired && (
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">بنجيب أصناف المتجر…</p>
            )
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-white/15">
              <p className="text-sm text-stone-500 dark:text-stone-400">لسه مفيش أصناف في المتجر ده.</p>
            </div>
          ) : (
            <ul aria-label="أصناف المتجر" className="mt-3 space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-white/10 dark:bg-surface-card"
                >
                  <ItemThumb item={item} size="md" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>

                  {/* تأكيد في المكان بدل نافذة المتصفح */}
                  {confirmingId === item.id ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        disabled={removingId === item.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-progress disabled:opacity-70"
                      >
                        {removingId === item.id ? 'بنشيل…' : 'شيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId('')}
                        disabled={removingId === item.id}
                        className="rounded-lg px-2 py-1.5 text-xs text-stone-500 transition hover:text-stone-700 disabled:opacity-60 dark:text-stone-400"
                      >
                        رجوع
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(item.id)}
                      className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
                    >
                      شيل
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
