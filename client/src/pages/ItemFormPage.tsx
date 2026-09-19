import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notch, compactFieldClass, fieldClass } from '../components/OutlinedField';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';
import { aswaqApiConfigured, fetchItem, postItem, putItem, type Item, type ItemUnit } from '../lib/aswaqApi';
import { uploadImage, uploadsConfigured, UploadError } from '../lib/cloudinary';
import { PRICE_FIELDS, PRICE_GROUPS, PRICE_LABELS, type PriceField } from '../lib/itemUnits';
import { useUnsavedWork } from '../lib/unsavedWork';

/**
 * إضافة صنف أو تعديله — نفس الفورم، والفرق إن فيه itemId في الرابط ولا لأ.
 *
 * الصنف بيتباع بوحدات، وكل الوحدات بالعدد: محتوى الوحدة = كام من أصغر وحدة
 * (الكرتونة فيها ١٢ قطعة، والدستة ممكن تكون هي أصغر وحدة بمحتوى ١). لازم تكون
 * فيه وحدة محتواها ١ — وده شرط السيرفر كمان.
 *
 * الوزن والحجم بتوع الوحدة الواحدة: التحميل على العربية بيقف عند أقصى وزن
 * أو أقصى حجم، والحديد بيوصل للوزن والإسفنج بيوصل للحجم.
 *
 * الأسعار بتتكتب بالجنيه وبتتبعت بالقرش (أعداد صحيحة)، عشان الكسور العشرية
 * متلعبش في الحساب.
 */

interface UnitDraft extends Record<PriceField, string> {
  name: string;
  unitContent: string;
  /** بالجنيه في الخانة، وبيتبعت بالقرش */
  avgCost: string;
  rate: string;
  /** بالجرام */
  weight: string;
  /** بالسنتيمتر المكعب */
  volume: string;
}

const emptyUnit = (unitContent: string): UnitDraft => ({
  name: '',
  unitContent,
  avgCost: '',
  rate: '',
  weight: '',
  volume: '',
  onSWP: '',
  onSRP: '',
  onLWP: '',
  onLRP: '',
});

/** الفورم كله في نص واحد — عشان نعرف اتغيّر عن اللي اتفتح بيه ولا لأ */
const formSnapshot = (name: string, picture: string, units: UnitDraft[]) => JSON.stringify([name, picture, units]);

/** جنيه (نص) → قرش. فاضي = null · مش رقم = undefined */
function toPiastres(value: string): number | null | undefined {
  const clean = value.trim();
  if (!clean) return null;
  const pounds = Number(clean);
  if (!Number.isFinite(pounds) || pounds < 0) return undefined;
  return Math.round(pounds * 100);
}

/** رقم اختياري مش سالب (الوزن والحجم). فاضي = null · غلط = undefined */
function toAmount(value: string): number | null | undefined {
  const clean = value.trim();
  if (!clean) return null;
  const amount = Number(clean);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

/** قرش → جنيه للكتابة في الخانة. ١٤٠٠٠ → "140" و١٢٥٠ → "12.50" */
const toPounds = (piastres: number | null): string =>
  piastres === null ? '' : (piastres / 100).toFixed(2).replace(/\.00$/, '');

/** أصناف اتحفظت قبل الحقول دي ممكن متكونش فيها خالص، فـ== null مش === null */
const toText = (value: number | null | undefined): string => (value == null ? '' : String(value));

const toDraft = (unit: ItemUnit): UnitDraft => ({
  name: unit.name,
  unitContent: String(unit.unitContent),
  avgCost: toPounds(unit.avgCost ?? null),
  rate: toText(unit.rate),
  weight: toText(unit.weight),
  volume: toText(unit.volume),
  onSWP: toPounds(unit.onSWP),
  onSRP: toPounds(unit.onSRP),
  onLWP: toPounds(unit.onLWP),
  onLRP: toPounds(unit.onLRP),
});

export function ItemFormPage() {
  const { accountId = '', itemId } = useParams<{ accountId: string; itemId: string }>();
  const editing = Boolean(itemId);
  const { user, businesses, businessesLoading, signIn, withToken } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [picture, setPicture] = useState('');
  const [units, setUnits] = useState<UnitDraft[]>([emptyUnit('1')]);
  /** الصنف زي ما جه من السيرفر — منه بناخد rate وisOwner وقت الحفظ */
  const [source, setSource] = useState<Item | null>(null);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** الفورم زي ما اتفتح: فاضي، أو الصنف زي ما جه من السيرفر */
  const [baseline, setBaseline] = useState(() => formSnapshot('', '', [emptyUnit('1')]));

  // أي فرق عن اللي اتفتح بيه = صنف لسه متحفظش، وتغيير الحساب من المنيو بيسأل قبل ما يضيّعه
  useUnsavedWork(formSnapshot(name, picture, units) !== baseline);

  const business = businesses.find((b) => b.accountId === accountId);

  // التعديل: بنجيب الصنف ونملا بيه الفورم
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;

    setLoading(true);
    withToken((token) => fetchItem(token, accountId, itemId))
      .then((item) => {
        if (cancelled) return;
        const drafts = item.units.map(toDraft);
        setSource(item);
        setName(item.name);
        setPicture(item.picture ?? '');
        setUnits(drafts);
        setBaseline(formSnapshot(item.name, item.picture ?? '', drafts));
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setLoadError(err instanceof ApiError ? err.message : 'مقدرناش نجيب الصنف.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, itemId, withToken]);

  /** الصورة بتترفع أول ما تتختار، واللي بيتحفظ مع الصنف هو رابطها */
  async function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // بنفضّي الخانة عشان لو اختار نفس الملف تاني الحدث يشتغل
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      setPicture(await uploadImage(file));
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'مقدرناش نرفع الصورة. جرّب تاني.');
    } finally {
      setUploading(false);
    }
  }

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

      // كل الوحدات بالعدد: كام من أصغر وحدة، فمفيش كسور
      const content = Number(unit.unitContent);
      if (!Number.isInteger(content) || content < 1) {
        return `محتوى وحدة «${unitName}» لازم يكون عدد صحيح من ١ فأكتر — كام من أصغر وحدة.`;
      }

      const avgCost = toPiastres(unit.avgCost);
      if (avgCost === undefined) return `avg في وحدة «${unitName}» مش رقم مظبوط.`;

      const rateText = unit.rate.trim();
      const rate = rateText ? Number(rateText) : null;
      if (rate !== null && !Number.isFinite(rate)) return `rate في وحدة «${unitName}» مش رقم مظبوط.`;

      const weight = toAmount(unit.weight);
      if (weight === undefined) return `weight في وحدة «${unitName}» لازم يكون رقم بالجرام.`;
      const volume = toAmount(unit.volume);
      if (volume === undefined) return `volume في وحدة «${unitName}» لازم يكون رقم بالسنتيمتر المكعب.`;

      const prices = {} as Record<PriceField, number | null>;
      for (const field of PRICE_FIELDS) {
        const price = toPiastres(unit[field]);
        if (price === undefined) return `سعر «${PRICE_LABELS[field]}» في وحدة «${unitName}» مش رقم مظبوط.`;
        prices[field] = price;
      }

      built.push({ name: unitName, unitContent: content, avgCost, rate, weight, volume, ...prices });
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
    const fields = { name: cleanName, picture: picture.trim() || null, units: built };
    try {
      if (editing && itemId) {
        await withToken((token) =>
          putItem(token, accountId, itemId, {
            ...fields,
            // مش في الفورم، فبنرجّعهم زي ما هما
            rate: source?.rate ?? 0,
            isOwner: source?.isOwner ?? true,
          }),
        );
        // المستخدم جاي من قائمة الأصناف — نرجّعه لها وهي فيها الخبر
        navigate(`/business/${accountId}/items`, { state: { saved: cleanName } });
        return;
      }

      const item = await withToken((token) => postItem(token, accountId, fields));
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
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{editing ? 'تعديل صنف' : 'إضافة صنف'}</h1>
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
          «{saved}» اتحفظ. تقدر تضيف صنف تاني، أو تشوفه في{' '}
          <Link to={`/business/${accountId}/items`} className="font-semibold underline">
            الأصناف
          </Link>
          .
        </p>
      )}

      {loading ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 dark:border-white/10 dark:bg-surface-card dark:text-stone-400">
          بنجيب الصنف…
        </p>
      ) : loadError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
          <Link
            to={`/business/${accountId}/items`}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            رجوع للأصناف ←
          </Link>
        </div>
      ) : (
        /*
         * على الموبايل الفورم بعرض الشاشة كله (-mx-4) ومن غير كارت جوه كارت:
         * الهوامش المتداخلة كانت بتاكل حوالي ٤٠ بكسل من كل ناحية والخانات بتضيق.
         * من sm وطالع يرجع كارت عادي.
         */
        <form
          onSubmit={handleSubmit}
          className="-mx-4 border-y border-stone-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-surface-card sm:mx-0 sm:rounded-2xl sm:border sm:p-5"
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

          {/* الصورة بتترفع أول ما تتختار، والصنف بيتحفظ برابطها */}
          <div className="mt-7">
            <span className="mb-2 block text-xs font-medium text-stone-500 dark:text-stone-400">
              صورة الصنف (اختياري)
            </span>

            <div className="flex flex-wrap items-center gap-3">
              {picture ? (
                <img src={picture} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 text-[11px] text-stone-400 dark:border-white/20">
                  مفيش صورة
                </div>
              )}

              {uploadsConfigured ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={`rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium transition dark:border-white/15 ${
                      uploading ? 'cursor-progress opacity-70' : 'cursor-pointer hover:border-brand-400'
                    }`}
                  >
                    {uploading ? 'بنرفع…' : picture ? 'غيّر الصورة' : 'اختار صورة'}
                    <input type="file" accept="image/*" disabled={uploading} onChange={handlePick} className="hidden" />
                  </label>

                  {picture && !uploading && (
                    <button
                      type="button"
                      onClick={() => setPicture('')}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:underline dark:text-red-300"
                    >
                      شيل الصورة
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-400">رفع الصور مش متظبط في النسخة دي.</p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-stone-200 pt-5 dark:border-white/10">
            <h2 className="font-display text-lg font-bold">الوحدات</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              محتوى كل وحدة = كام من أصغر وحدة: الكرتونة فيها 12 قطعة، والدستة ممكن تكون هي أصغر
              وحدة بمحتوى ١. لازم تكون فيه وحدة محتواها ١. خانة weight بالجرام وخانة volume
              بالسنتيمتر المكعب للوحدة الواحدة. الأسعار وavg بالجنيه، وسيب اللي لسه متحددش فاضي.
            </p>

            {units.map((unit, index) => (
              /* على الموبايل خط فاصل بس بين الوحدات بدل بوكس — عشان الهوامش */
              <div
                key={index}
                className="mt-5 border-t border-stone-200 pt-4 dark:border-white/10 sm:rounded-xl sm:border sm:p-4"
              >
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

                {/* صف: الاسم والمحتوى */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="relative block">
                    <input
                      value={unit.name}
                      onChange={(e) => setUnitField(index, 'name', e.target.value)}
                      maxLength={40}
                      placeholder="قطعة، دستة، كرتونة…"
                      className={compactFieldClass}
                    />
                    <Notch compact>اسم الوحدة</Notch>
                  </label>

                  <label className="relative block">
                    <input
                      value={unit.unitContent}
                      onChange={(e) => setUnitField(index, 'unitContent', e.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                      className={compactFieldClass}
                    />
                    <Notch compact>محتواها بأصغر وحدة</Notch>
                  </label>
                </div>

                {/* صف: avg و rate و weight و volume */}
                <div className="mt-4 grid grid-cols-4 gap-1.5">
                  <label className="relative block">
                    <input
                      value={unit.avgCost}
                      onChange={(e) => setUnitField(index, 'avgCost', e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={compactFieldClass}
                    />
                    <Notch compact>avg</Notch>
                  </label>

                  <label className="relative block">
                    <input
                      value={unit.rate}
                      onChange={(e) => setUnitField(index, 'rate', e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={compactFieldClass}
                    />
                    <Notch compact>rate</Notch>
                  </label>

                  <label className="relative block">
                    <input
                      value={unit.weight}
                      onChange={(e) => setUnitField(index, 'weight', e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={compactFieldClass}
                    />
                    <Notch compact>weight</Notch>
                    <span className="mt-1 block text-center text-[10px] text-stone-400">بالجرام</span>
                  </label>

                  <label className="relative block">
                    <input
                      value={unit.volume}
                      onChange={(e) => setUnitField(index, 'volume', e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={compactFieldClass}
                    />
                    <Notch compact>volume</Notch>
                    <span className="mt-1 block text-center text-[10px] text-stone-400">بالسم³</span>
                  </label>
                </div>

                {/* الأسعار الأربعة في صف واحد: المحل (جملة، قطاعي) والأونلاين (جملة، قطاعي) */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {PRICE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="mb-2.5 text-center text-[11px] font-medium text-stone-400">{group.label}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.fields.map(({ field, label }) => (
                          <label key={field} className="relative block">
                            <input
                              value={unit[field]}
                              onChange={(e) => setUnitField(index, field, e.target.value)}
                              inputMode="decimal"
                              placeholder="0.00"
                              aria-label={PRICE_LABELS[field]}
                              className={compactFieldClass}
                            />
                            <Notch compact>{label}</Notch>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setUnits((prev) => [...prev, emptyUnit('')])}
              className="mt-5 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:border-brand-400 dark:border-white/20 dark:text-stone-300"
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
              disabled={submitting || uploading}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
            >
              {submitting ? 'بنحفظ…' : uploading ? 'بنرفع الصورة…' : editing ? 'احفظ التعديل' : 'احفظ الصنف'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
            >
              إلغاء
            </button>
            <Link
              to={`/business/${accountId}/items`}
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              الأصناف ←
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
