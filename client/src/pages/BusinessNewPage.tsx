import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type BusinessAddress } from '../context/AuthContext';
import { COUNTRIES, GOVERNORATE_NAMES, citiesOf } from '../data/egypt';
import { LocationPicker } from '../components/LocationPicker';
import {
  canLookupAnyPoint,
  detectPlace,
  lookupPoint,
  GeolocateError,
  type Coords,
  type DetectedPlace,
} from '../lib/geolocate';

/** أقصى طول للاختصار — بيظهر كشارة صغيرة فمينفعش يكون طويل */
const ABBR_MAX = 8;

/** وسط القاهرة — نقطة بداية الخريطة قبل ما المستخدم يحدد حاجة */
const DEFAULT_POINT: Coords = { lat: 30.0444, lng: 31.2357 };

const EMPTY_ADDRESS: BusinessAddress = {
  label: '',
  description: '',
  country: 'مصر',
  governorate: '',
  city: '',
  district: '',
  street: '',
  landmark: '',
  lat: DEFAULT_POINT.lat,
  lng: DEFAULT_POINT.lng,
};

const fieldClass =
  'w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 outline-none transition focus:border-brand-500 dark:border-white/15';

/**
 * تسجيل نشاط تجاري جديد.
 *
 * العنوان: الدولة والمحافظة من قوايم ثابتة، والمدينة قايمة بتقبل الكتابة كمان
 * (مصر فيها مئات المدن، والقايمة عندنا بالمراكز الرئيسية بس). الحي والشارع
 * والعلامة المميزة كتابة حرة.
 *
 * زرار "حدّد موقعي" بيملا الدولة والمحافظة والمدينة، والخانات بتفضل قابلة
 * للتعديل بعدها — تحديد الموقع على الكمبيوتر بيعتمد على الـIP وممكن يغلط.
 */
export function BusinessNewPage() {
  const { user, businesses, createBusiness, signIn } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [address, setAddress] = useState<BusinessAddress>(EMPTY_ADDRESS);
  const [error, setError] = useState('');

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [located, setLocated] = useState(false);

  /** آخر نشاط اتسجّل — بنعرض تأكيد بدل ما نحوّل، لأن صفحة النشاطات لسه متعملتش */
  const [justCreated, setJustCreated] = useState<{ name: string; abbreviation: string } | null>(null);

  function setField<K extends keyof BusinessAddress>(key: K, value: BusinessAddress[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function applyPlace(place: DetectedPlace) {
    setAddress((prev) => ({
      ...prev,
      country: place.country || prev.country,
      governorate: place.governorate ?? prev.governorate,
      city: place.city || prev.city,
      // الحي بييجي من جوجل بس، ومبنمسحش اللي المستخدم كتبه لو مرجعش حاجة
      district: place.district || prev.district,
    }));
    setLocated(true);
    // لقينا الموقع بس المحافظة مش في قايمتنا — نقول للمستخدم يختارها بنفسه
    setLocateError(place.governorate ? '' : 'حدّدنا الموقع بس مقدرناش نطابق المحافظة. اختارها من القايمة.');
  }

  async function handleLocate() {
    setLocating(true);
    setLocateError('');
    try {
      const { coords, place } = await detectPlace();
      setAddress((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
      applyPlace(place);
    } catch (err) {
      setLocateError(err instanceof GeolocateError ? err.message : 'حصلت مشكلة في تحديد الموقع.');
    } finally {
      setLocating(false);
    }
  }

  /**
   * المستخدم حرّك الدبوس. الإحداثيات بتتحدّث دايماً؛ أما جلب العنوان للنقطة
   * الجديدة فبيحصل بس لما يكون عندنا مفتاح جوجل — الخدمة المجانية شروطها
   * بتحصر الاستخدام في موقع الجهاز الحقيقي مش أي نقطة على الخريطة.
   */
  async function handlePointChange(coords: Coords) {
    setAddress((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    if (!canLookupAnyPoint) return;

    setLocating(true);
    try {
      applyPlace(await lookupPoint(coords));
    } catch (err) {
      setLocateError(err instanceof GeolocateError ? err.message : 'مقدرناش نجيب عنوان النقطة دي.');
    } finally {
      setLocating(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanAbbr = abbreviation.trim();

    if (!cleanName || !cleanAbbr) {
      setError('اكتب اسم النشاط والاختصار.');
      return;
    }
    // الاختصار بيتعرض كشارة، فتكراره بيخلي الأنشطة مش متميّزة عن بعض
    if (businesses.some((b) => b.abbreviation.toLowerCase() === cleanAbbr.toLowerCase())) {
      setError('الاختصار ده مستخدم في نشاط تاني عندك. اختار غيره.');
      return;
    }
    if (!address.governorate || !address.city.trim()) {
      setError('اختار المحافظة والمدينة.');
      return;
    }

    const trimmed: BusinessAddress = {
      ...address,
      label: address.label.trim(),
      description: address.description.trim(),
      country: address.country.trim(),
      governorate: address.governorate,
      city: address.city.trim(),
      district: address.district.trim(),
      street: address.street.trim(),
      landmark: address.landmark.trim(),
    };

    createBusiness({ name: cleanName, abbreviation: cleanAbbr, address: trimmed });
    setJustCreated({ name: cleanName, abbreviation: cleanAbbr });
    setName('');
    setAbbreviation('');
    setAddress(EMPTY_ADDRESS);
    setLocated(false);
    setLocateError('');
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          تسجيل نشاط تجاري متاح بعد تسجيل الدخول.
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

  if (justCreated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 text-center dark:border-accent-500/25 dark:bg-accent-500/10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white font-display text-sm font-bold text-brand-800 dark:bg-white/10 dark:text-brand-200">
            <span className="truncate px-1">{justCreated.abbreviation}</span>
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">اتسجّل النشاط</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            «{justCreated.name}» بقى في قائمة نشاطاتك — تلاقيه تحت اسمك فوق.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setJustCreated(null)}
              className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:border-brand-400 dark:border-white/15 dark:bg-transparent"
            >
              سجّل نشاط تاني
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              تمام
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cities = citiesOf(address.governorate);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">أنشئ نشاط تجاري</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        سجّل نشاطك عشان تبدأ تبيع على أسواق.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">اسم النشاط التجاري</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            required
            maxLength={80}
            placeholder="مثال: شركة النور للتجارة"
            className={fieldClass}
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">الاختصار</span>
          <input
            value={abbreviation}
            onChange={(e) => { setAbbreviation(e.target.value); setError(''); }}
            required
            maxLength={ABBR_MAX}
            placeholder="مثال: النور"
            className={fieldClass}
          />
          <span className="mt-1.5 block text-xs text-stone-400">
            اسم قصير بيظهر كشارة جنب نشاطك — {ABBR_MAX} حروف كحد أقصى.
          </span>
        </label>

        {/* ————— العنوان ————— */}
        <fieldset className="mt-7 border-t border-stone-200 pt-5 dark:border-white/10">
          <legend className="sr-only">عنوان النشاط</legend>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">العنوان</h2>
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60 dark:border-white/15 dark:hover:text-brand-400"
            >
              {locating ? 'بنحدد موقعك…' : '📍 حدّد موقعي'}
            </button>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
            زرار تحديد الموقع بيملا الدولة والمحافظة والمدينة. تقدر تعدّلهم بعدها،
            وتقدر تكتب العنوان كله بإيدك من غير ما تستخدمه.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">اسم العنوان</span>
              <input
                value={address.label}
                onChange={(e) => setField('label', e.target.value)}
                maxLength={60}
                placeholder="مثال: الفرع الرئيسي"
                className={fieldClass}
              />
              <span className="mt-1.5 block text-xs text-stone-400">
                اسم يفرّق العنوان ده عن غيره لو ليك أكتر من مكان.
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">وصف العنوان</span>
              <textarea
                value={address.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="مثال: الدور التالت فوق صيدلية النور، المدخل من الشارع الجانبي"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </div>

          {locateError && (
            <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {locateError}
            </p>
          )}
          {located && !locateError && (
            <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2.5 text-sm text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
              عبّينا الدولة والمحافظة والمدينة — راجعهم وكمّل باقي العنوان.
            </p>
          )}

          <div className="mt-4">
            <LocationPicker
              value={{ lat: address.lat, lng: address.lng }}
              onChange={handlePointChange}
              onLocate={handleLocate}
              locating={locating}
              hint={
                canLookupAnyPoint
                  ? 'اسحب الدبوس أو دوس على الخريطة لتحديد مكان نشاطك بالظبط — الأسماء هتتحدّث لوحدها.'
                  : 'اسحب الدبوس أو دوس على الخريطة لتحديد مكان نشاطك بالظبط. الأسماء تحت مش هتتغيّر لوحدها — عدّلها بإيدك لو محتاج.'
              }
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">الدولة</span>
              <select
                value={address.country}
                onChange={(e) => setField('country', e.target.value)}
                className={fieldClass}
              >
                {/* الدولة الوحيدة دلوقتي — قايمة المحافظات اللي عندنا مصرية */}
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">المحافظة</span>
              <select
                value={address.governorate}
                onChange={(e) => {
                  // المدينة تابعة للمحافظة، فتغييرها بيلغي اختيار قديم بقى مش منطقي
                  setAddress((prev) => ({ ...prev, governorate: e.target.value, city: '' }));
                  setError('');
                }}
                required
                className={fieldClass}
              >
                <option value="">اختار المحافظة</option>
                {GOVERNORATE_NAMES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">المدينة</span>
              <input
                list="aswaq-cities"
                value={address.city}
                onChange={(e) => setField('city', e.target.value)}
                required
                disabled={!address.governorate}
                placeholder={address.governorate ? 'اختار أو اكتب' : 'اختار المحافظة الأول'}
                className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
              />
              {/* قايمة بتقبل الكتابة: مصر فيها مدن أكتر من اللي عندنا */}
              <datalist id="aswaq-cities">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">الحي</span>
              <input
                value={address.district}
                onChange={(e) => setField('district', e.target.value)}
                maxLength={60}
                placeholder="مثال: المنشية"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">الشارع</span>
              <input
                value={address.street}
                onChange={(e) => setField('street', e.target.value)}
                maxLength={100}
                placeholder="مثال: شارع الجمهورية، عمارة ١٢"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">علامة مميزة</span>
              <input
                value={address.landmark}
                onChange={(e) => setField('landmark', e.target.value)}
                maxLength={100}
                placeholder="مثال: جنب مسجد النور"
                className={fieldClass}
              />
              <span className="mt-1.5 block text-xs text-stone-400">
                حاجة قريبة تسهّل الوصول للمكان.
              </span>
            </label>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            سجّل النشاط
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
          >
            إلغاء
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        البيانات محفوظة على المتصفح ده دلوقتي، فمش هتلاقيها لو فتحت من جهاز تاني.
        ربطها بالحساب لسه في الطريق.
      </p>
    </div>
  );
}
