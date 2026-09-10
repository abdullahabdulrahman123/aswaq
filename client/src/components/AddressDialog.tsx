import { useEffect, useRef, useState } from 'react';
import type { BusinessAddress } from '../context/AuthContext';
import { COUNTRIES, GOVERNORATE_NAMES, citiesOf } from '../data/egypt';
import { LocationPicker } from './LocationPicker';
import {
  canLookupAnyPoint,
  detectPlace,
  lookupPoint,
  GeolocateError,
  type Coords,
  type DetectedPlace,
} from '../lib/geolocate';

const fieldClass =
  'w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 outline-none transition focus:border-brand-500 dark:border-white/15';

/** وسط القاهرة — نقطة بداية الخريطة قبل ما المستخدم يحدد حاجة */
const DEFAULT_POINT = { lat: 30.0444, lng: 31.2357 };

/** المسودة اللي بتبدأ بيها أي إضافة جديدة */
export const EMPTY_ADDRESS: BusinessAddress = {
  id: '',
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

interface Props {
  open: boolean;
  /** العنوان الحالي — بيتنسخ لمسودة جوه الدايالوج */
  value: BusinessAddress;
  /** بيغيّر العنوان والزرار بس — الخانات واحدة في الحالتين */
  mode: 'add' | 'edit';
  onSave: (address: BusinessAddress) => void;
  onClose: () => void;
}

/**
 * نافذة تحديد العنوان.
 *
 * الشغل كله على *مسودة* جوه الدايالوج: التعديل مبيوصلش للفورم اللي بره غير
 * لما المستخدم يدوس حفظ. فالإلغاء بيرجّع كل حاجة زي ما كانت — وده المتوقع
 * من أي نافذة فيها حفظ وإلغاء.
 *
 * بنستخدم عنصر <dialog> الأصلي مش div عادي: بيدينا حبس التركيز جوه النافذة،
 * وقفل بزرار Esc، وخلفية معتمة — كل ده من غير كود ولا مكتبة.
 */
export function AddressDialog({ open, value, mode, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [draft, setDraft] = useState<BusinessAddress>(value);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [located, setLocated] = useState(false);

  // فتح وقفل النافذة الأصلية بالتزامن مع الحالة
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة تبدأ من العنوان المحفوظ — عشان الإلغاء يرجّع الأصل فعلاً
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setError('');
    setLocateError('');
    setLocated(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setField<K extends keyof BusinessAddress>(key: K, v: BusinessAddress[K]) {
    setDraft((prev) => ({ ...prev, [key]: v }));
    setError('');
  }

  function applyPlace(place: DetectedPlace) {
    setDraft((prev) => ({
      ...prev,
      country: place.country || prev.country,
      governorate: place.governorate ?? prev.governorate,
      city: place.city || prev.city,
      // الحي بييجي من جوجل بس، ومبنمسحش اللي المستخدم كتبه لو مرجعش حاجة
      district: place.district || prev.district,
    }));
    setLocated(true);
    setLocateError(place.governorate ? '' : 'حدّدنا الموقع بس مقدرناش نطابق المحافظة. اختارها من القايمة.');
  }

  async function handleLocate() {
    setLocating(true);
    setLocateError('');
    try {
      const { coords, place } = await detectPlace();
      setDraft((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
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
    setDraft((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
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

  function handleSave() {
    if (!draft.governorate || !draft.city.trim()) {
      setError('اختار المحافظة والمدينة.');
      return;
    }
    onSave({
      ...draft,
      label: draft.label.trim(),
      description: draft.description.trim(),
      country: draft.country.trim(),
      city: draft.city.trim(),
      district: draft.district.trim(),
      street: draft.street.trim(),
      landmark: draft.landmark.trim(),
    });
  }

  const cities = citiesOf(draft.governorate);

  return (
    <dialog
      ref={dialogRef}
      // الإغلاق ممكن ييجي من Esc كمان، مش من زرار الإلغاء بس
      onClose={onClose}
      aria-label="عنوان النشاط"
      /*
       * العرض في style مش كلاس: Tailwind مبيطلّعش كلاس فيه فاصلة جوه min()،
       * فالنافذة كانت بتفضل بعرض صفر والخريطة تترسم 2px.
       */
      style={{ width: 'min(38rem, 92vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      {/* المحتوى بيتركّب بس والنافذة مفتوحة — الخريطة محتاجة مقاس حقيقي وقت الإنشاء */}
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {mode === 'add' ? 'إضافة عنوان' : 'تعديل العنوان'}
            </h2>
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
              value={{ lat: draft.lat, lng: draft.lng }}
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
                value={draft.country}
                onChange={(e) => setField('country', e.target.value)}
                className={fieldClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">المحافظة</span>
              <select
                value={draft.governorate}
                onChange={(e) => {
                  // المدينة تابعة للمحافظة، فتغييرها بيلغي اختيار قديم بقى مش منطقي
                  setDraft((prev) => ({ ...prev, governorate: e.target.value, city: '' }));
                  setError('');
                }}
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
                value={draft.city}
                onChange={(e) => setField('city', e.target.value)}
                disabled={!draft.governorate}
                placeholder={draft.governorate ? 'اختار أو اكتب' : 'اختار المحافظة الأول'}
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
                value={draft.district}
                onChange={(e) => setField('district', e.target.value)}
                maxLength={60}
                placeholder="مثال: المنشية"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">الشارع</span>
              <input
                value={draft.street}
                onChange={(e) => setField('street', e.target.value)}
                maxLength={100}
                placeholder="مثال: شارع الجمهورية، عمارة ١٢"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">اسم العنوان</span>
              <input
                value={draft.label}
                onChange={(e) => setField('label', e.target.value)}
                maxLength={60}
                placeholder="مثال: الفرع الرئيسي"
                className={fieldClass}
              />
              <span className="mt-1.5 block text-xs text-stone-400">
                اسم يفرّق العنوان ده عن غيره لو ليك أكتر من مكان.
              </span>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">وصف العنوان</span>
              <textarea
                value={draft.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="مثال: الدور التالت فوق صيدلية النور، المدخل من الشارع الجانبي"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">علامة مميزة</span>
              <input
                value={draft.landmark}
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

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              {mode === 'add' ? 'إضافة العنوان' : 'حفظ التعديل'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
