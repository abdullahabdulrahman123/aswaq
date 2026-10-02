import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, personInitial } from '../components/Avatar';
import { Notch, fieldClass } from '../components/OutlinedField';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { latinDigits } from '../lib/quantity';
import { ApiError, SessionExpiredError, deleteEmployee, fetchEmployees, postEmployee, searchUsers, type Employee, type UserMatch } from '../lib/waslaApi';

/** الإيميل كامل، أو الرقم كامل، أو ٣ حروف من الاسم — زي وصلة */
const searchable = (q: string) => /\S+@\S+\.\S+/.test(q) || latinDigits(q).replace(/[\s+-]/g, '').length >= 8 || [...q.trim()].length >= 3;

const jobLabel = (e: Employee) => (e.owner ? 'صاحب الشركة' : e.job);

/**
 * «الموظفين» بطلب العميل (مكالمة ١ أكتوبر) — زي «إدارة أصناف المتاجر»: بدوّر على
 * مستخدم (بالاسم أو الإيميل أو الرقم) وأضيفه للنشاط بوظيفته. كل موظف بيدخل
 * بحسابه هو، والنشاط بيظهر له في «شركاتي». الموظفين متسجّلين في وصلة
 * (business_employees)، وصاحب النشاط أولهم.
 *
 * الصلاحيات لسه: الموظف بيعمل كل حاجة في النشاط، إلا إضافة وشيل الموظفين —
 * دول لصاحب الشركة بس، والموظف بيشوف الليستة وبس.
 */
export function EmployeesPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, withToken, sessionExpired } = useAuth();
  const business = businesses.find((b) => b.accountId === accountId);
  const isOwner = (business?.job ?? 'owner') === 'owner';

  /** null = لسه بنجيب */
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  /** null = مفيش بحث، 'loading' = بندوّر */
  const [matches, setMatches] = useState<UserMatch[] | 'loading' | null>(null);
  const [picked, setPicked] = useState<UserMatch | null>(null);
  const [job, setJob] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState('');

  useEffect(() => {
    if (!user || sessionExpired || !business) return;
    let cancelled = false;
    withToken((token) => fetchEmployees(token, accountId))
      .then((list) => {
        if (!cancelled) setEmployees(list);
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setEmployees([]);
        setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب الموظفين.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, user, sessionExpired, Boolean(business), withToken]);

  // البحث بيستنى نص ثانية من غير كتابة
  useEffect(() => {
    const q = query.trim();
    if (!isOwner || !searchable(q)) {
      setMatches(null);
      return;
    }
    setMatches('loading');
    let cancelled = false;
    const timer = setTimeout(() => {
      withToken((token) => searchUsers(token, accountId, q.includes('@') || /[\p{L}]/u.test(q) ? q : latinDigits(q).replace(/[\s-]/g, '')))
        .then((found) => {
          if (!cancelled) setMatches(found);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, accountId, isOwner, withToken]);

  async function handleAdd() {
    if (!picked || saving) return;
    setSaving(true);
    setError('');
    try {
      setEmployees(await withToken((token) => postEmployee(token, accountId, picked.accountId, job.trim())));
      setPicked(null);
      setJob('');
      setQuery('');
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      setError(err instanceof ApiError && err.status === 409 ? 'ده موظف في الشركة بالفعل.' : err instanceof ApiError ? err.message : 'مقدرناش نضيف الموظف.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(employee: Employee) {
    setSaving(true);
    setError('');
    try {
      setEmployees(await withToken((token) => deleteEmployee(token, accountId, employee.accountId)));
      setConfirmingId('');
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) setError(err instanceof ApiError ? err.message : 'مقدرناش نشيل الموظف.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-stone-500 dark:text-stone-400">سجّل دخولك الأول.</p>;
  }
  if (!business) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-stone-500 dark:text-stone-400">
        {businessesLoading ? 'بنجيب النشاط…' : 'النشاط ده مش موجود.'}
      </p>
    );
  }

  const already = new Set((employees ?? []).map((e) => e.accountId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الموظفين</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        لنشاط <span className="font-semibold text-stone-700 dark:text-stone-200">{business.name}</span>
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {isOwner ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          {/* gap أوسع من العادي: اسم كل خانة طالع فوق حدّها بـ٨ بكسل */}
          <div className="grid gap-5">
            <label className="relative block">
              <input
                className={fieldClass}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPicked(null);
                }}
                dir="auto"
                placeholder="الاسم، أو الإيميل أو الرقم كامل"
              />
              <Notch>دوّر على مستخدم</Notch>
            </label>

            {!picked && query.trim() && (
              <div>
                {matches === 'loading' || matches === null ? (
                  <p className="text-xs text-stone-400">{matches === 'loading' ? 'بندوّر…' : 'كمّل الاسم (٣ حروف) أو الإيميل أو الرقم.'}</p>
                ) : matches.length === 0 ? (
                  <p className="text-xs text-stone-400">مفيش مستخدم كده.</p>
                ) : (
                  <ul aria-label="نتايج البحث" className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 dark:divide-white/5 dark:border-white/10">
                    {matches.map((m) => (
                      <li key={m.accountId}>
                        <button
                          type="button"
                          disabled={already.has(m.accountId)}
                          onClick={() => setPicked(m)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
                        >
                          <Avatar picture={m.picture} fallback={personInitial(m.name, undefined)} kind="person" size={28} tone="soft" />
                          <span className="min-w-0 flex-1 truncate">{m.name}</span>
                          {already.has(m.accountId) && <span className="shrink-0 text-xs text-stone-400">موظف بالفعل</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {picked && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar picture={picked.picture} fallback={personInitial(picked.name, undefined)} kind="person" size={32} tone="soft" />
                  <span className="truncate font-semibold">{picked.name}</span>
                </div>
                <label className="relative block w-40">
                  <input className={fieldClass} value={job} onChange={(e) => setJob(e.target.value)} placeholder="موظف" maxLength={40} />
                  <Notch>الوظيفة</Notch>
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
                >
                  {saving ? 'بنضيف…' : 'إضافة'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-white/5 dark:text-stone-300">صاحب الشركة بس اللي بيضيف ويشيل الموظفين.</p>
      )}

      <h2 className="mt-8 font-display text-lg font-bold">
        الموظفين {employees !== null && <span className="text-sm font-normal text-stone-400">{employees.length}</span>}
      </h2>
      {employees === null ? (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">بنجيب الموظفين…</p>
      ) : (
        <ul aria-label="موظفين الشركة" className="mt-3 space-y-2">
          {employees.map((e) => (
            <li key={e.accountId} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-white/10 dark:bg-surface-card">
              <Avatar picture={e.picture} fallback={personInitial(e.name, undefined)} kind="person" size={36} tone="soft" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.name}</span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{jobLabel(e)}</span>
              </span>
              {isOwner &&
                !e.owner &&
                (confirmingId === e.accountId ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(e)}
                      disabled={saving}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                    >
                      شيل
                    </button>
                    <button type="button" onClick={() => setConfirmingId('')} className="rounded-lg px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400">
                      رجوع
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(e.accountId)}
                    className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
                  >
                    شيل
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
