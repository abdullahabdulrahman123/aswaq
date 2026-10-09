import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Notch, fieldClass } from '../components/OutlinedField';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { fetchOrder, fetchReceipts, fetchSafes, postReceipt, type Collection, type Order, type Safe } from '../lib/aswaqApi';
import { egp } from '../lib/money';
import { serialTag, stateNumber } from '../lib/orderFlow';
import { moneyInput, toPiastres, toPounds } from '../lib/quantity';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';

/**
 * «تحصيل» — إيصال استلام نقدية على فاتورة بيع (مكالمة ٧ أكتوبر). زرار جنب مراحل الفاتورة
 * مش مرحلة، وبيفتح الصفحة دي: «إيصال استلام النقدية هو حاجة تخينة مش حاجة رفيعة».
 *
 *   - من: العميل اللي في الفاتورة، مقفول — حسابه الفرعي فاضي لحد ما يبقى طرف أصيل ويحدده
 *   - إلى: النشاط، في خزنة من الخزن اللي في عهدة اللي بيحصّل (غالباً واحدة)
 *   - المبلغ: اللي فاضل على الفاتورة، ويقدر يحصّل جزء. رسالة العميل ٨ أكتوبر: أول دوسة
 *     بتعلّم الرقم كله (يكتب فوقه على طول)، والرقم ده في عنوان الخانة كمرجع كان كام
 *
 * الرجوع (زرار الصفحة أو زرار الموبايل) بيرجّعه مكان ما داس «تحصيل» — الصفحة اللي
 * فتحتها بتبعت from؛ ولو اتفتحت لوحدها بترجع لفاتورتها.
 */
export function ReceiptPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { user, businesses, withToken } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [order, setOrder] = useState<Order | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  /** الخزن اللي في عهدته — null = لسه بنجيب */
  const [safes, setSafes] = useState<Safe[] | null>(null);
  const [safeId, setSafeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  /** آخر إيصال اتحفظ من هنا */
  const [saved, setSaved] = useState<{ number: number; amount: number; safe: string } | null>(null);
  /** خانة المبلغ لسه واخدة الفوكس — أول دوسة بعده بتعلّم الرقم كله، واللي بعدها بتحط المؤشر عادي */
  const justFocused = useRef(false);

  const loadCollection = useCallback(async () => {
    const c = await withToken((token) => fetchReceipts(token, orderId));
    setCollection(c);
    setAmount(c.remaining > 0 ? toPounds(c.remaining) : '');
    return c;
  }, [orderId, withToken]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const o = await withToken((token) => fetchOrder(token, orderId));
        if (cancelled) return;
        setOrder(o);
        await loadCollection();
        const mine = (await withToken((token) => fetchSafes(token, o.from.acc))).filter((s) => s.mine);
        if (cancelled) return;
        setSafes(mine);
        setSafeId(mine[0]?.id ?? '');
      } catch (err) {
        if (cancelled || err instanceof SessionExpiredError) return;
        setLoadError(err instanceof ApiError && err.status === 404 ? 'الفاتورة دي مش موجودة.' : 'مقدرناش نجيب الفاتورة.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, user, withToken, loadCollection]);

  const back = () => (from ? navigate(-1) : navigate(`/invoice/${orderId}`));

  async function handleSave() {
    if (saving || !collection) return;
    const piastres = toPiastres(amount);
    if (!piastres) {
      setError('اكتب المبلغ اللي استلمته.');
      return;
    }
    if (piastres > collection.remaining) {
      setError(`المبلغ أكبر من الباقي على الفاتورة (${egp(collection.remaining)}).`);
      return;
    }
    const safe = safes?.find((s) => s.id === safeId);
    if (!safe) {
      setError('اختار الخزنة اللي الفلوس هتدخلها.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const done = await withToken((token) => postReceipt(token, orderId, { safeId, amount: piastres, notes: notes.trim() || undefined }));
      setSaved({ number: done.receipt.number, amount: done.receipt.amount, safe: safe.name });
      setNotes('');
      await loadCollection();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (err instanceof ApiError && err.status === 422) {
        const c = await loadCollection().catch(() => null);
        setError(c ? `المبلغ أكبر من الباقي على الفاتورة (${egp(c.remaining)}) — حد حصّل جزء منها دلوقتي.` : 'المبلغ أكبر من الباقي على الفاتورة.');
      } else {
        setError(
          err instanceof ApiError && err.status === 403
            ? 'الخزنة دي مش في عهدتك.'
            : err instanceof ApiError && err.status === 409
              ? 'الفاتورة دي اتلغت — مفيش تحصيل عليها.'
              : err instanceof ApiError
                ? err.message
                : 'مقدرناش نحفظ الإيصال. جرّب تاني.',
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">سجّل دخولك الأول.</p>;
  }
  if (loadError) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">{loadError}</p>;
  }
  if (!order || !collection) {
    return <p className="mx-auto max-w-2xl px-4 py-8 text-sm text-gray-500 dark:text-gray-400">بنجيب الفاتورة…</p>;
  }

  const cancelled = order.state === 'cancelled';
  // صاحب الشركة يعمل خزنة لنفسه من «الخزن»، والموظف صاحب الشركة يعملهاله
  // (لحد ما أنشطته توصل من وصلة بيتعامل كموظف — مش العكس)
  const membership = businesses.find((b) => b.accountId === order.from.acc);
  const owner = Boolean(membership) && (membership?.job ?? 'owner') === 'owner';
  /** الرقم اللي الخانة بتتملي بيه (الباقي على الفاتورة) — من غير «ج.م»، العنوان فيه «جنيه» */
  const reference = egp(Math.max(0, collection.remaining)).replace(' ج.م', '');
  const selectAll = (el: HTMLInputElement) => el.setSelectionRange(0, el.value.length);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button type="button" onClick={back} className="mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
        رجوع
      </button>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">إيصال استلام نقدية</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {/* رقم الفاتورة لو بقت فاتورة، وإلا رقم الطلب (مكالمة ٨ أكتوبر) */}
        تحصيل على <span className="font-semibold text-gray-700 dark:text-gray-200">{stateNumber(order, true)}</span>
        {serialTag(order) && <span className="text-gray-400"> · {serialTag(order)}</span>}
      </p>

      <div className="mt-5">
        <SessionExpiredNotice />
      </div>

      <dl aria-label="حساب الفاتورة" className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-white/10 dark:bg-surface-card">
        <div>
          <dt className="text-[11px] text-gray-500 dark:text-gray-400">إجمالي الفاتورة</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{egp(order.netTotal)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-gray-500 dark:text-gray-400">اتحصّل</dt>
          <dd data-paid className="mt-0.5 font-semibold tabular-nums">{egp(collection.paid)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-gray-500 dark:text-gray-400">الباقي</dt>
          <dd data-remaining className="mt-0.5 font-display text-lg font-bold tabular-nums text-accent-700 dark:text-accent-300">
            {egp(Math.max(0, collection.remaining))}
          </dd>
        </div>
      </dl>

      {saved && (
        <p role="status" className="mt-4 rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
          اتحفظ إيصال رقم {saved.number}: {egp(saved.amount)} في «{saved.safe}».
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {cancelled ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">الفاتورة دي اتلغت — مفيش تحصيل عليها.</p>
      ) : collection.remaining <= 0 ? (
        <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">الفاتورة اتحصّلت كلها.</p>
      ) : (
        <section aria-label="التحصيل" className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <div className="grid gap-5">
            <label className="relative block">
              <input className={`${fieldClass} disabled:text-gray-700 dark:disabled:text-gray-200`} value={order.names.buyer} disabled />
              <Notch>من — العميل</Notch>
            </label>
            <label className="relative block">
              <input className={`${fieldClass} disabled:text-gray-700 dark:disabled:text-gray-200`} value={order.names.business} disabled />
              <Notch>إلى</Notch>
            </label>
            {safes === null ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">بنجيب الخزن…</p>
            ) : safes.length === 0 ? (
              <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                {owner ? (
                  <>
                    مفيش خزنة في عهدتك — اعمل واحدة من{' '}
                    <Link to={`/business/${order.from.acc}/safes`} className="font-semibold underline underline-offset-2">
                      «الخزن»
                    </Link>
                    .
                  </>
                ) : (
                  'مفيش خزنة في عهدتك — صاحب الشركة يعملك واحدة من «الخزن».'
                )}
              </p>
            ) : (
              <label className="relative block">
                <select className={fieldClass} value={safeId} onChange={(e) => setSafeId(e.target.value)}>
                  {safes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Notch>الخزنة</Notch>
              </label>
            )}
            <label className="relative block">
              <input
                className={`${fieldClass} font-semibold tabular-nums`}
                value={amount}
                onChange={(e) => {
                  setAmount(moneyInput(e.target.value));
                  setError('');
                }}
                onFocus={(e) => {
                  justFocused.current = true;
                  const el = e.currentTarget;
                  requestAnimationFrame(() => selectAll(el));
                }}
                // على الموبايل الدوسة نفسها بتحط المؤشر بعد الفوكس فبتشيل التعليم — بنعلّم تاني مرة واحدة
                onClick={(e) => {
                  if (!justFocused.current) return;
                  justFocused.current = false;
                  selectAll(e.currentTarget);
                }}
                onBlur={() => {
                  justFocused.current = false;
                }}
                inputMode="decimal"
              />
              <Notch>
                المبلغ (جنيه) · <span data-amount-reference className="tabular-nums">{reference}</span>
              </Notch>
            </label>
            <label className="relative block">
              <input className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="اختياري" />
              <Notch>ملاحظات</Notch>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !safes?.length}
              className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
            >
              {saving ? 'بنحفظ…' : 'حفظ الإيصال'}
            </button>
          </div>
        </section>
      )}

      {collection.receipts.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-bold">الإيصالات على الفاتورة دي</h2>
          <ul aria-label="إيصالات الفاتورة" className="mt-3 space-y-2">
            {collection.receipts.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-surface-card">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">إيصال رقم {r.number}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    في «{r.names.safe}» — {r.creator.name} ·{' '}
                    {new Date(r.createdAt).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {r.notes && <span className="block truncate text-xs text-gray-400">{r.notes}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{egp(r.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
