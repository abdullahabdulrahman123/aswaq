import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Notch, fieldClass } from '../components/OutlinedField';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { fetchSafes, type Safe } from '../lib/aswaqApi';
import { egp } from '../lib/money';
import { moneyInput, toPiastres, toPounds } from '../lib/quantity';
import { ApiError, SessionExpiredError, fetchEmployees, postSafe, putSafe, type Employee } from '../lib/waslaApi';

/**
 * «الخزن» (مكالمة ٧ أكتوبر) — خزن وبنوك النشاط: «الخزنة الرئيسية»، «عهدة متولي»…
 * مش لازم خزنة حقيقية: «ممكن تكون جيب التابلوه بتاع العربية». لكل خزنة اسم، والموظف
 * المسؤول عنها، ورصيد افتتاحي («إحنا ما بننشئش شركة من الصفر»).
 *
 * الخزنة في وصلة (حساب فرعي)، ورصيدها من أسواق: الافتتاحي + اللي دخلها − اللي طلع.
 * «تحصيل» على فاتورة البيع بيروح لخزنة في عهدة اللي بيحصّل. العمل والتعديل لصاحب
 * الشركة بس لحد ما الصلاحيات تكمل.
 */
interface Draft {
  name: string;
  custodianId: string;
  /** جنيه كتابة */
  opening: string;
}

const EMPTY: Draft = { name: '', custodianId: '', opening: '' };

export function SafesPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, withToken, sessionExpired } = useAuth();
  const business = businesses.find((b) => b.accountId === accountId);
  const isOwner = (business?.job ?? 'owner') === 'owner';

  /** null = لسه بنجيب */
  const [safes, setSafes] = useState<Safe[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  /** الخزنة اللي بتتعدّل، أو '' */
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      withToken((token) => fetchSafes(token, accountId))
        .then(setSafes)
        .catch((err: unknown) => {
          if (err instanceof SessionExpiredError) return;
          setSafes([]);
          setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب الخزن.');
        }),
    [accountId, withToken],
  );

  useEffect(() => {
    if (!user || sessionExpired || !business) return;
    void load();
    withToken((token) => fetchEmployees(token, accountId))
      .then(setEmployees)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, user, sessionExpired, Boolean(business), load]);

  // المسؤول افتراضياً صاحب الشركة — أول واحد في الليستة
  useEffect(() => {
    if (!draft.custodianId && employees.length) setDraft((d) => ({ ...d, custodianId: employees[0].accountId }));
  }, [employees, draft.custodianId]);

  async function save(input: Draft, safeId: string | null) {
    if (saving) return;
    if (!input.name.trim()) {
      setError('اكتب اسم الخزنة — مثلاً «الخزنة الرئيسية» أو «عهدة متولي».');
      return;
    }
    if (!input.custodianId) {
      setError('اختار الموظف المسؤول عن الخزنة.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { name: input.name.trim(), custodianId: input.custodianId, openingBalance: toPiastres(input.opening) ?? 0 };
      await withToken((token) => (safeId ? putSafe(token, accountId, safeId, body) : postSafe(token, accountId, body)));
      if (safeId) setEditingId('');
      else setDraft({ ...EMPTY, custodianId: input.custodianId });
      await load();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      setError(err instanceof ApiError && err.status === 403 ? 'صاحب الشركة بس اللي بيعمل الخزن ويعدّلها.' : err instanceof ApiError ? err.message : 'مقدرناش نحفظ الخزنة.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">سجّل دخولك الأول.</p>;
  }
  if (!business) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        {businessesLoading ? 'بنجيب النشاط…' : 'النشاط ده مش موجود.'}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الخزن</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        لنشاط <span className="font-semibold text-gray-700 dark:text-gray-200">{business.name}</span>
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
        <section aria-label="خزنة جديدة" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <h2 className="mb-5 font-display text-base font-bold">خزنة جديدة</h2>
          <SafeFields draft={draft} employees={employees} onChange={setDraft} />
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => save(draft, null)}
              disabled={saving}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
            >
              {saving && !editingId ? 'بنضيف…' : 'إضافة'}
            </button>
          </div>
        </section>
      ) : (
        <p className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">صاحب الشركة بس اللي بيعمل الخزن ويعدّلها.</p>
      )}

      <h2 className="mt-8 font-display text-lg font-bold">
        الخزن {safes !== null && <span className="text-sm font-normal text-gray-400">{safes.length}</span>}
      </h2>
      {safes === null ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">بنجيب الخزن…</p>
      ) : safes.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">لسه مفيش خزن.</p>
      ) : (
        <ul aria-label="خزن الشركة" className="mt-3 space-y-2">
          {safes.map((s) => (
            <li key={s.id} data-safe={s.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-surface-card">
              {editingId === s.id ? (
                <>
                  <SafeFields draft={editDraft} employees={employees} onChange={setEditDraft} />
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId('')} className="rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      رجوع
                    </button>
                    <button
                      type="button"
                      onClick={() => save(editDraft, s.id)}
                      disabled={saving}
                      className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
                    >
                      {saving ? 'بنحفظ…' : 'حفظ'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                    {isOwner && (
                      <button
                        type="button"
                        aria-label={`تعديل ${s.name}`}
                        onClick={() => {
                          setEditDraft({ name: s.name, custodianId: s.custodian.accountId, opening: toPounds(s.openingBalance) });
                          setEditingId(s.id);
                          setError('');
                        }}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:border-gray-400 dark:border-white/15"
                      >
                        تعديل
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex items-end gap-3">
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="block text-gray-500 dark:text-gray-400">
                        في عهدة {s.custodian.name || '—'}
                        {s.mine && ' (أنت)'}
                      </span>
                      <span className="mt-0.5 block text-gray-400 tabular-nums">الرصيد الافتتاحي {egp(s.openingBalance)}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block text-[11px] text-gray-400">الرصيد</span>
                      <span data-balance className={`block font-display text-lg font-bold tabular-nums ${s.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {egp(s.balance)}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** اسم الخزنة والمسؤول عنها ورصيدها الافتتاحي — للجديدة وللتعديل */
function SafeFields({ draft, employees, onChange }: { draft: Draft; employees: Employee[]; onChange: (d: Draft) => void }) {
  return (
    <div className="grid gap-5">
      <label className="relative block">
        <input
          className={fieldClass}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="مثال: الخزنة الرئيسية، عهدة متولي"
          maxLength={60}
        />
        <Notch>اسم الخزنة</Notch>
      </label>
      <label className="relative block">
        <select className={fieldClass} value={draft.custodianId} onChange={(e) => onChange({ ...draft, custodianId: e.target.value })}>
          {/* المسؤول القديم لو اتشال من الموظفين — يفضل ظاهر لحد ما يتغيّر */}
          {draft.custodianId && !employees.some((e) => e.accountId === draft.custodianId) && <option value={draft.custodianId}>—</option>}
          {employees.map((e) => (
            <option key={e.accountId} value={e.accountId}>
              {e.owner ? `${e.name} — صاحب الشركة` : `${e.name} — ${e.job}`}
            </option>
          ))}
        </select>
        <Notch>المسؤول عنها</Notch>
      </label>
      <label className="relative block">
        <input
          className={`${fieldClass} tabular-nums`}
          value={draft.opening}
          onChange={(e) => onChange({ ...draft, opening: moneyInput(e.target.value) })}
          inputMode="decimal"
          placeholder="0"
        />
        <Notch>الرصيد الافتتاحي (جنيه)</Notch>
      </label>
    </div>
  );
}
