import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notch, fieldClass } from '../components/OutlinedField';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { aswaqApiConfigured, postItem, type ItemUnit } from '../lib/aswaqApi';

/**
 * إضافة صنف لنشاط تجاري.
 *
 * الصنف بيتباع بوحدات: "علبة" جواها ١٢ "قطعة" مثلاً. الكميات كلها بتتحسب
 * بأصغر وحدة، فلازم تكون فيه وحدة محتواها ١ — وده شرط السيرفر كمان.
 *
 * الأسعار بتتكتب بالجنيه وبتتبعت بالقرش (أعداد صحيحة)، عشان الكسور العشرية
 * متلعبش في الحساب.
 */

/** أسماء الأسعار زي ما العميل كتبها في مخططه */
const PRICE_FIELDS = ['onSWP', 'onSRP', 'onLWP', 'onLRP'] as const;
type PriceField = (typeof PRICE_FIELDS)[number];

interface UnitDraft extends Record<PriceField, string> {
  name: string;
  unitContent: string;
}

const emptyUnit = (unitContent: string): UnitDraft => ({
  name: '',
  unitContent,
  onSWP: '',
  onSRP: '',
  onLWP: '',
  onLRP: '',
});

/** جنيه (نص) → قرش. فاضي = null · مش رقم = undefined */
function toPiastres(value: string): number | null | undefined {
  const clean = value.trim();
  if (!clean) return null;
  const pounds = Number(clean);
  if (!Number.isFinite(pounds) || pounds < 0) return undefined;
  return Math.round(pounds * 100);
}

export function ItemNewPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, signIn, withToken } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [picture, setPicture] = useState('');
  const [units, setUnits] = useState<UnitDraft[]>([emptyUnit('1')]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const business = businesses.find((b) => b.accountId === accountId);

  function setUnitField(index: number, field: keyof UnitDraft, value: string) {
    setUnits((prev) => prev.map((unit, i) => (i === index ? { ...unit, [field]: value } : unit)));
    setError('');
  }

  /** الوحدات جاهزة للسيرفر، أو رسالة غلط تتعرض للمستخدم */
  function buildUnits(): ItemUnit[] | string {
    const built: ItemUnit[] = [];

    for (const unit of units) {
      const unitName = unit.name.trim();
      if (!unitName) return 'اكتب اسم كل وحدة.';

      const content = Number(unit.unitContent);
      if (!Number.isInteger(content) || content < 1) {
        return `محتوى وحدة «${unitName}» لازم يكون رقم صحيح من ١ فأكتر.`;
      }

      const prices = {} as Record<PriceField, number | null>;
      for (const field of PRICE_FIELDS) {
        const price = toPiastres(unit[field]);
        if (price === undefined) return `سعر ${field} في وحدة «${unitName}» مش رقم مظبوط.`;
        prices[field] = price;
      }

      built.push({ name: unitName, unitContent: content, rate: null, ...prices });
    }

    if (!built.some((unit) => unit.unitContent === 1)) {
      return 'لازم تكون فيه وحدة محتواها ١ — دي أصغر وحدة بتتحسب بيها الكميات.';
    }
    if (new Set(built.map((unit) => unit.name)).size !== built.length) {
      return 'فيه وحدتين بنفس الاسم.';
    }
    return built;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setError('اكتب اسم الصنف.');
      return;
    }
    const built = buildUnits();
    if (typeof built === 'string') {
      setError(built);
      return;
    }

    setSubmitting(true);
    setSaved('');
    try {
      const item = await withToken((token) =>
        postItem(token, accountId, { name: cleanName, picture: picture.trim() || null, units: built }),
      );
      setSaved(item.name);
      setName('');
      setPicture('');
      setUnits([emptyUnit('1')]);
      setError('');
    } catch (err) {
      // انتهاء الجلسة ليه تنبيه لوحده فوق الفورم
      if (!(err instanceof SessionExpiredError)) {
        setError(err instanceof ApiError ? err.message : 'مقدرناش نحفظ الصنف. جرّب تاني.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          إضافة الأصناف متاحة بعد تسجيل الدخول.
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
      <h1 className="font-display text-2xl font-bold sm:text-3xl">إضافة صنف</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        لنشاط <span className="font-semibold text-stone-700 dark:text-stone-200">{business.name}</span>
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {!aswaqApiConfigured && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          سيرفر الأصناف مش متوصّل بالنسخة دي، فالحفظ مش هيشتغل.
        </p>
      )}

      {saved && (
        <p role="status" className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-200">
          «{saved}» اتحفظ. تقدر تضيف صنف تاني.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card"
      >
        {/* mt-2 على الأولى: اسم الخانة طالع فوق حدّها بـ٨ بكسل */}
        <label className="relative mt-2 block">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            required
            maxLength={120}
            placeholder="مثال: سكر أبيض"
            className={fieldClass}
          />
          <Notch>اسم الصنف</Notch>
        </label>

        <label className="relative mt-6 block">
          <input
            value={picture}
            onChange={(e) => {
              setPicture(e.target.value);
              setError('');
            }}
            type="url"
            maxLength={2000}
            placeholder="https://…"
            className={fieldClass}
          />
          <Notch>رابط صورة (اختياري)</Notch>
        </label>

        <div className="mt-8 border-t border-stone-200 pt-5 dark:border-white/10">
          <h2 className="font-display text-lg font-bold">الوحدات</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            لازم تكون فيه وحدة محتواها ١ — دي أصغر وحدة بتتحسب بيها الكميات.
            الأسعار بالجنيه، وسيبها فاضية لو لسه متحددتش.
          </p>

          {units.map((unit, index) => (
            <div key={index} className="mt-4 rounded-xl border border-stone-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-stone-400">وحدة {index + 1}</span>
                {units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnits((prev) => prev.filter((_, i) => i !== index));
                      setError('');
                    }}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    شيل الوحدة
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="relative block">
                  <input
                    value={unit.name}
                    onChange={(e) => setUnitField(index, 'name', e.target.value)}
                    maxLength={40}
                    placeholder="مثال: كيلو"
                    className={fieldClass}
                  />
                  <Notch>اسم الوحدة</Notch>
                </label>

                <label className="relative block">
                  <input
                    value={unit.unitContent}
                    onChange={(e) => setUnitField(index, 'unitContent', e.target.value)}
                    inputMode="numeric"
                    placeholder="1"
                    className={fieldClass}
                  />
                  <Notch>محتواها بأصغر وحدة</Notch>
                </label>

                {PRICE_FIELDS.map((field) => (
                  <label key={field} className="relative block">
                    <input
                      value={unit[field]}
                      onChange={(e) => setUnitField(index, field, e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={fieldClass}
                    />
                    <Notch>{field}</Notch>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setUnits((prev) => [...prev, emptyUnit('')])}
            className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:border-brand-400 dark:border-white/20 dark:text-stone-300"
          >
            + وحدة تانية
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
          >
            {submitting ? 'بنحفظ…' : 'احفظ الصنف'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
          >
            إلغاء
          </button>
          <Link
            to={`/business/${accountId}`}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            صفحة النشاط ←
          </Link>
        </div>
      </form>
    </div>
  );
}
