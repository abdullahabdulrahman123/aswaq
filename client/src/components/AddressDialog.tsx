import { useEffect, useRef, useState } from 'react';
import type { BusinessAddress } from '../context/AuthContext';
import { COUNTRIES, GOVERNORATE_NAMES, citiesOf } from '../data/egypt';
import { LocationPicker } from './LocationPicker';
import { Notch, fieldClass } from './OutlinedField';
import {
  canLookupAnyPoint,
  detectPlace,
  lookupPoint,
  GeolocateError,
  type Coords,
  type DetectedPlace,
} from '../lib/geolocate';

/** وسط القاهرة — نقطة بداية الخريطة قبل ما المستخدم يحدد حاجة */
const DEFAULT_POINT = { lat: 30.0444, lng: 31.2357 };

/** المسودة اللي بيبدأ بيها أي عنوان جديد */
export const EMPTY_ADDRESS: BusinessAddress = {
  id: '',
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
  /** اسم المقر اللي العنوان ده بتاعه — بيظهر تحت العنوان لو مكتوب */
  premisesName: string;
  /**
   * «تم»: في فورم المقر العنوان بيرجع للفورم والحفظ بيحصل مع المقر. في
   * «عناويني» الحفظ بيحصل هنا: بترجع Promise، ولو رمت النافذة بتعرض الخطأ
   * وتفضل مفتوحة.
   */
  onDone: (address: BusinessAddress) => void | Promise<void>;
  onClose: () => void;
  /** «مكان {المقر} بالظبط» في شرح الخريطة — عنوان المستخدم مش مقر */
  placeNoun?: string;
}

/**
 * «حدد العنوان» — العنوان على الخريطة وتفاصيله. بتتفتح من فورم المقر
 * (PremisesDialog)، و«تم» بيرجّع العنوان للفورم؛ الحفظ بيحصل مع المقر. وبتتفتح
 * كمان لعنوان من «عناويني»، وساعتها «تم» بيحفظ على طول.
 *
 * الشغل كله على *مسودة* جوه الدايالوج: التعديل مبيوصلش للفورم اللي بره غير
 * لما المستخدم يدوس «تم». فالرجوع بيسيب كل حاجة زي ما كانت.
 *
 * بنستخدم عنصر <dialog> الأصلي مش div عادي: بيدينا حبس التركيز جوه النافذة،
 * وقفل بزرار Esc، وخلفية معتمة — كل ده من غير كود ولا مكتبة.
 */
export function AddressDialog({ open, value, premisesName, onDone, onClose, placeNoun = 'المقر' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [draft, setDraft] = useState<BusinessAddress>(value);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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

  // كل فتحة تبدأ من العنوان اللي في فورم المقر — عشان الرجوع يسيب الأصل فعلاً
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setError('');
    setSaving(false);
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

  async function handleDone() {
    if (saving) return;
    if (!draft.governorate || !draft.city.trim()) {
      setError('اختار المحافظة والمدينة.');
      return;
    }
    const pending = onDone({
      ...draft,
      description: draft.description.trim(),
      country: draft.country.trim(),
      city: draft.city.trim(),
      district: draft.district.trim(),
      street: draft.street.trim(),
      landmark: draft.landmark.trim(),
    });
    if (!pending) return;

    setSaving(true);
    try {
      await pending;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مقدرناش نحفظ العنوان. جرّب تاني.');
    } finally {
      setSaving(false);
    }
  }

  const cities = citiesOf(draft.governorate);

  return (
    <dialog
      ref={dialogRef}
      // الإغلاق ممكن ييجي من Esc كمان، مش من زرار الإلغاء بس
      onClose={onClose}
      aria-label="حدد العنوان"
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
            <h2 className="font-display text-lg font-bold">حدد العنوان</h2>
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
            {premisesName && <>عنوان «{premisesName}». </>}
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
                  ? `اسحب الدبوس أو دوس على الخريطة لتحديد مكان ${placeNoun} بالظبط — الأسماء هتتحدّث لوحدها.`
                  : `اسحب الدبوس أو دوس على الخريطة لتحديد مكان ${placeNoun} بالظبط. الأسماء تحت مش هتتغيّر لوحدها — عدّلها بإيدك لو محتاج.`
              }
            />
          </div>

          {/* gap أوسع من العادي: اسم كل خانة طالع فوق حدّها بـ٨ بكسل */}
          {/* اسم المقر ونوعه مش هنا — دول في فورم المقر نفسه، والعنوان خاصية من خواصه */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="relative block">
              <select
                value={draft.country}
                onChange={(e) => setField('country', e.target.value)}
                className={fieldClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Notch>الدولة</Notch>
            </label>

            <label className="relative block">
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
              <Notch>المحافظة</Notch>
            </label>

            <label className="relative block">
              <input
                list="aswaq-cities"
                value={draft.city}
                onChange={(e) => setField('city', e.target.value)}
                disabled={!draft.governorate}
                placeholder={draft.governorate ? 'اختار أو اكتب' : 'اختار المحافظة الأول'}
                className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
              />
              <Notch>المدينة</Notch>
              {/* قايمة بتقبل الكتابة: مصر فيها مدن أكتر من اللي عندنا */}
              <datalist id="aswaq-cities">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="relative block">
              <input
                value={draft.district}
                onChange={(e) => setField('district', e.target.value)}
                maxLength={60}
                placeholder="مثال: المنشية"
                className={fieldClass}
              />
              <Notch>الحي</Notch>
            </label>

            <label className="relative block sm:col-span-2">
              <input
                value={draft.street}
                onChange={(e) => setField('street', e.target.value)}
                maxLength={100}
                placeholder="مثال: شارع الجمهورية، عمارة ١٢"
                className={fieldClass}
              />
              <Notch>الشارع</Notch>
            </label>

            <label className="relative block sm:col-span-2">
              <textarea
                value={draft.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="مثال: الدور التالت فوق صيدلية النور، المدخل من الشارع الجانبي"
                /* block عشان الـtextarea ميسيبش فراغ تحته جوه الـlabel */
                className={`${fieldClass} block resize-y`}
              />
              <Notch>وصف العنوان</Notch>
            </label>

            <label className="relative block sm:col-span-2">
              <input
                value={draft.landmark}
                onChange={(e) => setField('landmark', e.target.value)}
                maxLength={100}
                placeholder="مثال: جنب مسجد النور"
                className={fieldClass}
              />
              <Notch>علامة مميزة</Notch>
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
              onClick={handleDone}
              disabled={saving}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
            >
              {saving ? 'بنحفظ…' : 'تم'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
            >
              رجوع
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
