import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { fetchSettings, saveSettings, type StageTemplate } from '../lib/aswaqApi';
import { isOwner } from '../lib/permissions';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';

/**
 * «الإعدادات» — بطلب العميل (مكالمة ٢ أكتوبر): الإعداد على الشركة كلها، والصلاحية
 * لفرد بعينه (دي في «الموظفين»). الإعدادات بتزيد مع كل موضوع ندخل فيه.
 *
 * أول إعداد: مراحل البيع. قالب عام من أسواق، وصاحب الشركة بيختار منه اللي بيستخدمه
 * (checklist) ويرتّبه — «في ناس بتعمل تجهيز مسبق، وفي المطاعم الطلب يسبق التجهيز».
 * «مؤكد» في الأول و«مكتمل» في الآخر ثابتين. زرار «تأكيد» في «مبيعات» بيمشي على
 * المراحل دي بالترتيب، والمشتري بيشوف اسم المرحلة على طلبه.
 *
 * أي حد في الشركة بيشوفها، وصاحب الشركة بس اللي بيغيّرها.
 */
export function SettingsPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, withToken, sessionExpired } = useAuth();
  const business = businesses.find((b) => b.accountId === accountId);
  const owner = isOwner(business);

  const [template, setTemplate] = useState<StageTemplate[] | null>(null);
  /** المختار بالترتيب */
  const [chosen, setChosen] = useState<string[]>([]);
  /** آخر حاجة اتحفظت — عشان «حفظ» يتقفل لو مفيش تغيير */
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user || sessionExpired || !business) return;
    let cancelled = false;
    withToken((token) => fetchSettings(token, accountId))
      .then(({ settings, stageTemplate }) => {
        if (cancelled) return;
        setTemplate(stageTemplate);
        setChosen(settings.salesStages);
        setSaved(settings.salesStages);
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setTemplate([]);
        setError(err instanceof ApiError ? err.message : 'مقدرناش نجيب الإعدادات.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, user, sessionExpired, Boolean(business), withToken]);

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

  const byKey = new Map((template ?? []).map((s) => [s.key, s]));
  /** المختار بالترتيب، وبعده الباقي بترتيب القالب */
  const rows = [...chosen.flatMap((k) => byKey.get(k) ?? []), ...(template ?? []).filter((s) => !chosen.includes(s.key))];
  const dirty = chosen.join() !== saved.join();

  const toggle = (key: string) => {
    setNotice('');
    setChosen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const move = (key: string, by: -1 | 1) => {
    setNotice('');
    setChosen((prev) => {
      const i = prev.indexOf(key);
      const j = i + by;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const { settings } = await withToken((token) => saveSettings(token, accountId, { salesStages: chosen }));
      setChosen(settings.salesStages);
      setSaved(settings.salesStages);
      setNotice('اتحفظت. الفواتير الجاية والمفتوحة بتمشي على المراحل دي.');
    } catch (err) {
      if (!(err instanceof SessionExpiredError)) setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  }

  const flow = ['مؤكد', ...chosen.flatMap((k) => byKey.get(k)?.label ?? []), 'مكتمل'];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الإعدادات</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        لشركة <span className="font-semibold text-stone-700 dark:text-stone-200">{business.name}</span> كلها
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <section aria-labelledby="sales-stages" className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <h2 id="sales-stages" className="font-display text-lg font-bold">
          مراحل البيع
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          اختار المراحل اللي فواتيرك بتعدّي عليها بعد «تأكيد»، ورتّبها. زرار الفاتورة في «مبيعات» بيمشي عليها مرحلة مرحلة.
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          المشتري بيشوف اسم المرحلة على طلبه عشان يتابعه.
        </p>

        {template === null ? (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">بنجيب الإعدادات…</p>
        ) : (
          <>
            <ol aria-label="مراحل البيع" className="mt-4 space-y-2">
              <FixedRow label="مؤكد" note="بعد «تأكيد» على طول" />
              {rows.map((stage) => {
                const on = chosen.includes(stage.key);
                const i = chosen.indexOf(stage.key);
                return (
                  <li
                    key={stage.key}
                    data-stage={stage.key}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${on ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-stone-200 dark:border-white/10'}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!owner}
                      onChange={() => toggle(stage.key)}
                      aria-label={stage.label}
                      className="h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{stage.label}</span>
                      <span className="block text-xs text-stone-500 dark:text-stone-400">الزرار: «{stage.action}»</span>
                    </span>
                    {owner && on && (
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`${stage.label} لفوق`}
                          disabled={i === 0}
                          onClick={() => move(stage.key, -1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-stone-300 text-sm transition hover:border-stone-400 disabled:opacity-30 dark:border-white/15"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`${stage.label} لتحت`}
                          disabled={i === chosen.length - 1}
                          onClick={() => move(stage.key, 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-stone-300 text-sm transition hover:border-stone-400 disabled:opacity-30 dark:border-white/15"
                        >
                          ▼
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
              <FixedRow label="مكتمل" note="«إتمام» — بتخرج من «مهامي»" />
            </ol>

            <p aria-label="الترتيب" className="mt-4 text-sm leading-relaxed">
              <span className="text-stone-500 dark:text-stone-400">الفاتورة بتمشي كده: </span>
              <span className="font-semibold">{flow.join(' ← ')}</span>
            </p>

            {owner ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? 'بنحفظ…' : 'حفظ'}
                </button>
                {notice && (
                  <span role="status" className="text-sm text-accent-700 dark:text-accent-300">
                    {notice}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-white/5 dark:text-stone-300">صاحب الشركة بس اللي بيغيّر الإعدادات.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** «مؤكد» و«مكتمل» — ثابتين في أول وآخر الليستة */
function FixedRow({ label, note }: { label: string; note: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-stone-100 px-3 py-2.5 dark:bg-white/5">
      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center text-xs text-stone-400">
        ●
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400">{note}</span>
      </span>
      <span className="shrink-0 text-xs text-stone-400">ثابتة</span>
    </li>
  );
}
