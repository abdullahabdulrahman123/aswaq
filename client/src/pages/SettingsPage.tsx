import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { fetchSettings, saveSettings, type StageTemplate } from '../lib/aswaqApi';
import { isOwner } from '../lib/permissions';
import { STAGE_COLORS } from '../lib/stageColors';
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
 *
 * رسالة العميل ٦ أكتوبر: كل مرحلة ليها لون — «هوية بصرية للحالة… بس يديني شرط وانا
 * بختار الالوان ميبقاش لونين زي بعض». اللون اللي مرحلة تانية واخداه بيبقى مقفول،
 * ومؤكد ومكتمل وملغية ألوانهم ثابتة. رقم الفاتورة في «مهامي» بيتلوّن بيه.
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
  /** لون كل مرحلة في القالب، والمحفوظ منه */
  const [colors, setColors] = useState<Record<string, string>>({});
  const [savedColors, setSavedColors] = useState<Record<string, string>>({});
  /** الألوان اللي المراحل بتختار منها، وألوان مؤكد ومكتمل وملغية */
  const [choices, setChoices] = useState<string[]>([]);
  const [fixed, setFixed] = useState<Record<string, string>>({});
  /** المرحلة اللي ألوانها مفتوحة تحتها */
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user || sessionExpired || !business) return;
    let cancelled = false;
    withToken((token) => fetchSettings(token, accountId))
      .then(({ settings, stageTemplate, stageColorChoices, fixedColors }) => {
        if (cancelled) return;
        setTemplate(stageTemplate);
        setChosen(settings.salesStages);
        setSaved(settings.salesStages);
        setColors(settings.stageColors);
        setSavedColors(settings.stageColors);
        setChoices(stageColorChoices);
        setFixed(fixedColors);
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
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">سجّل دخولك الأول.</p>;
  }
  if (!business) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        {businessesLoading ? 'بنجيب النشاط…' : 'النشاط ده مش موجود.'}
      </p>
    );
  }

  const byKey = new Map((template ?? []).map((s) => [s.key, s]));
  /** المختار بالترتيب، وبعده الباقي بترتيب القالب */
  const rows = [...chosen.flatMap((k) => byKey.get(k) ?? []), ...(template ?? []).filter((s) => !chosen.includes(s.key))];
  const dirty = chosen.join() !== saved.join() || chosen.some((k) => colors[k] !== savedColors[k]);
  /** اللون واخداه مرحلة تانية من اللي الشركة شغالة بيها */
  const takenBy = (color: string, except: string) => chosen.find((k) => k !== except && colors[k] === color);

  const toggle = (key: string) => {
    setNotice('');
    if (chosen.includes(key)) {
      setChosen((prev) => prev.filter((k) => k !== key));
      if (picking === key) setPicking(null);
      return;
    }
    // مرحلة بتتضاف ولونها مع مرحلة تانية: تاخد أول لون فاضي
    if (takenBy(colors[key], key)) {
      const free = choices.find((c) => !takenBy(c, key));
      if (free) setColors((prev) => ({ ...prev, [key]: free }));
    }
    setChosen((prev) => [...prev, key]);
  };
  const pickColor = (key: string, color: string) => {
    setNotice('');
    setColors((prev) => ({ ...prev, [key]: color }));
    setPicking(null);
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
      const { settings } = await withToken((token) => saveSettings(token, accountId, { salesStages: chosen, stageColors: colors }));
      setChosen(settings.salesStages);
      setSaved(settings.salesStages);
      setColors(settings.stageColors);
      setSavedColors(settings.stageColors);
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
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        لشركة <span className="font-semibold text-gray-700 dark:text-gray-200">{business.name}</span> كلها
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <section aria-labelledby="sales-stages" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <h2 id="sales-stages" className="font-display text-lg font-bold">
          مراحل البيع
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          اختار المراحل اللي فواتيرك بتعدّي عليها بعد «تأكيد»، ورتّبها. زرار الفاتورة في «مبيعات» بيمشي عليها مرحلة مرحلة.
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          المشتري بيشوف اسم المرحلة على طلبه عشان يتابعه.
        </p>

        {template === null ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">بنجيب الإعدادات…</p>
        ) : (
          <>
            <ol aria-label="مراحل البيع" className="mt-4 space-y-2">
              <FixedRow label="مؤكد" note="بعد «تأكيد» على طول" color={fixed.order} />
              {rows.map((stage) => {
                const on = chosen.includes(stage.key);
                const i = chosen.indexOf(stage.key);
                const color = STAGE_COLORS[colors[stage.key]];
                return (
                  <li
                    key={stage.key}
                    data-stage={stage.key}
                    data-color={colors[stage.key]}
                    className={`rounded-xl border px-3 py-2.5 ${on ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-gray-200 dark:border-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!owner}
                      onChange={() => toggle(stage.key)}
                      aria-label={stage.label}
                      className="h-4 w-4 shrink-0 accent-brand-600"
                    />
                    {/* لون المرحلة — الدوسة بتفتح الألوان تحتها */}
                    <button
                      type="button"
                      aria-label={`لون ${stage.label}: ${color?.name ?? ''}`}
                      aria-expanded={picking === stage.key}
                      disabled={!owner || !on}
                      onClick={() => setPicking((p) => (p === stage.key ? null : stage.key))}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gray-300 transition hover:border-gray-400 disabled:cursor-default disabled:opacity-40 dark:border-white/20"
                    >
                      <span className={`h-4 w-4 rounded-full ${color?.dot ?? 'bg-gray-300'}`} />
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{stage.label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">الزرار: «{stage.action}»</span>
                    </span>
                    {owner && on && (
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`${stage.label} لفوق`}
                          disabled={i === 0}
                          onClick={() => move(stage.key, -1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 text-sm transition hover:border-gray-400 disabled:opacity-30 dark:border-white/15"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`${stage.label} لتحت`}
                          disabled={i === chosen.length - 1}
                          onClick={() => move(stage.key, 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 text-sm transition hover:border-gray-400 disabled:opacity-30 dark:border-white/15"
                        >
                          ▼
                        </button>
                      </span>
                    )}
                    </div>
                    {picking === stage.key && (
                      <div role="radiogroup" aria-label={`لون ${stage.label}`} className="mt-2.5 flex flex-wrap gap-2 ps-7">
                        {choices.map((c) => {
                          const other = takenBy(c, stage.key);
                          return (
                            <button
                              key={c}
                              type="button"
                              role="radio"
                              aria-checked={colors[stage.key] === c}
                              aria-label={`${STAGE_COLORS[c]?.name ?? c}${other ? ` — واخداه «${byKey.get(other)?.label ?? other}»` : ''}`}
                              title={other ? `واخداه «${byKey.get(other)?.label ?? other}»` : STAGE_COLORS[c]?.name}
                              disabled={Boolean(other)}
                              onClick={() => pickColor(stage.key, c)}
                              className={`grid h-8 w-8 place-items-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-25 ${
                                colors[stage.key] === c ? 'border-gray-900 dark:border-white' : 'border-transparent'
                              }`}
                            >
                              <span className={`h-6 w-6 rounded-full ${STAGE_COLORS[c]?.dot ?? ''}`} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
              <FixedRow label="مكتمل" note="«إتمام» — بتخرج من «مهامي»" color={fixed.done} />
            </ol>

            <p aria-label="الترتيب" className="mt-4 text-sm leading-relaxed">
              <span className="text-gray-500 dark:text-gray-400">الفاتورة بتمشي كده: </span>
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
              <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">صاحب الشركة بس اللي بيغيّر الإعدادات.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** «مؤكد» و«مكتمل» — ثابتين في أول وآخر الليستة، وبلونهم الثابت */
function FixedRow({ label, note, color }: { label: string; note: string; color?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-white/5">
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center">
        <span className={`h-4 w-4 rounded-full ${STAGE_COLORS[color ?? '']?.dot ?? 'bg-gray-400'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{note}</span>
      </span>
      <span className="shrink-0 text-xs text-gray-400">ثابتة</span>
    </li>
  );
}
