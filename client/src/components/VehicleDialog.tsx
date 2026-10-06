import { useEffect, useRef, useState } from 'react';
import type { Premises, Vehicle } from '../context/AuthContext';
import { DialogCloseButton, useBackdropClose } from './DialogClose';
import { Notch, compactFieldClass, fieldClass } from './OutlinedField';

/** المسودة اللي بتبدأ بيها أي إضافة */
export const EMPTY_VEHICLE: Vehicle = {
  id: '',
  plateNumber: '',
  maxWeightKg: null,
  maxVolumeM3: null,
  startCost: null,
  costPerKm: null,
  homePremisesId: null,
};

/** الكيبورد العربي بيكتب ٠-٩ و«٫» — بتتقري زي 0-9 و«.» */
const normalizeNumber = (text: string) =>
  text.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.');

/** الخانات نص عشان تبقى فاضية أو فيها «٢٫٥» وهو بيكتب */
interface Draft {
  plateNumber: string;
  maxWeightKg: string;
  maxVolumeM3: string;
  /** بالجنيه في الخانة، وبيتبعت بالقرش */
  startCost: string;
  costPerKm: string;
  homePremisesId: string;
}

const toText = (n: number | null) => (n === null ? '' : String(n));
const poundsText = (piastres: number | null) => (piastres === null ? '' : String(piastres / 100));

function draftOf(vehicle: Vehicle): Draft {
  return {
    plateNumber: vehicle.plateNumber,
    maxWeightKg: toText(vehicle.maxWeightKg),
    maxVolumeM3: toText(vehicle.maxVolumeM3),
    startCost: poundsText(vehicle.startCost),
    costPerKm: poundsText(vehicle.costPerKm),
    homePremisesId: vehicle.homePremisesId ?? '',
  };
}

/** رقم اختياري موجب لحد max. فاضي = null · غلط = undefined */
function amount(text: string, max: number): number | null | undefined {
  const value = normalizeNumber(text);
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}

const legendClass = 'mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400';

interface Props {
  open: boolean;
  value: Vehicle;
  /** مقرات النشاط — الجراج بيتختار منها */
  premises: Premises[];
  /** بيخلص لما الحفظ يخلص، وبيرمي لو فشل — النافذة بتعرض الخطأ وتفضل مفتوحة */
  onSave: (vehicle: Vehicle) => Promise<void>;
  onClose: () => void;
}

/**
 * فورم المركبة، بطلب العميل (مكالمة ٢٦ سبتمبر): رقم اللوحة، وأقصى وزن وأقصى
 * حجم (عشان تتعرف أنهي طلبية تتحط على أنهي عربية)، وتكلفة البداية وتكلفة
 * الكيلو زي أوبر، والجراج الأساسي. التصنيف (جامبو، ربع نقل…) مش مطلوب — «يهمني
 * الماكس ويت والماكس فوليوم». كله اختياري ما عدا اللوحة.
 */
export function VehicleDialog({ open, value, premises, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const [draft, setDraft] = useState<Draft>(() => draftOf(value));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mode = value.id ? 'edit' : 'add';

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة تبدأ من المركبة المحفوظة — عشان الإلغاء يرجّع الأصل فعلاً
  useEffect(() => {
    if (!open) return;
    setDraft(draftOf(value));
    setError('');
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setField(key: keyof Draft, text: string) {
    setDraft((prev) => ({ ...prev, [key]: text }));
    setError('');
  }

  async function handleSave() {
    if (saving) return;
    const plateNumber = draft.plateNumber.trim();
    if (!plateNumber) {
      setError('اكتب رقم اللوحة.');
      return;
    }
    const maxWeightKg = amount(draft.maxWeightKg, 100_000);
    if (maxWeightKg === undefined) return setError('أقصى وزن بالكيلو: رقم أكبر من صفر، أو سيبه فاضي.');
    const maxVolumeM3 = amount(draft.maxVolumeM3, 1_000);
    if (maxVolumeM3 === undefined) return setError('أقصى حجم بالمتر المكعب: رقم أكبر من صفر، أو سيبه فاضي.');
    const start = amount(draft.startCost, 100_000);
    if (start === undefined) return setError('تكلفة البداية بالجنيه: رقم أكبر من صفر، أو سيبها فاضية.');
    const perKm = amount(draft.costPerKm, 100_000);
    if (perKm === undefined) return setError('تكلفة الكيلو بالجنيه: رقم أكبر من صفر، أو سيبها فاضية.');

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...value,
        plateNumber,
        maxWeightKg,
        maxVolumeM3,
        startCost: start === null ? null : Math.round(start * 100),
        costPerKm: perKm === null ? null : Math.round(perKm * 100),
        homePremisesId: draft.homePremisesId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مقدرناش نحفظ المركبة. جرّب تاني.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label={mode === 'add' ? 'إضافة مركبة' : 'تعديل المركبة'}
      // العرض في style مش كلاس — نفس سبب باقي النوافذ
      style={{ width: 'min(32rem, 92vw)' }}
      className="rounded-2xl bg-white p-0 text-gray-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-gray-100"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="font-display text-lg font-bold">{mode === 'add' ? 'إضافة مركبة' : 'تعديل المركبة'}</h2>

          <div className="mt-6 grid gap-5">
            <label className="relative block">
              <input
                value={draft.plateNumber}
                onChange={(e) => setField('plateNumber', e.target.value)}
                maxLength={20}
                placeholder="مثال: ن ص ع ١٢٣٤"
                className={fieldClass}
              />
              <Notch>رقم اللوحة</Notch>
            </label>

            <fieldset>
              <legend className={legendClass}>الحمولة</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative block">
                  <input
                    value={draft.maxWeightKg}
                    onChange={(e) => setField('maxWeightKg', e.target.value)}
                    inputMode="decimal"
                    maxLength={9}
                    className={compactFieldClass}
                  />
                  <Notch compact>أقصى وزن (كجم)</Notch>
                </label>
                <label className="relative block">
                  <input
                    value={draft.maxVolumeM3}
                    onChange={(e) => setField('maxVolumeM3', e.target.value)}
                    inputMode="decimal"
                    maxLength={9}
                    className={compactFieldClass}
                  />
                  <Notch compact>أقصى حجم (م³)</Notch>
                </label>
              </div>
              <span className="mt-1.5 block text-xs text-gray-400">
                أقصى حاجة العربية تشيلها. الطلبية بتتحط على العربية اللي تستحملها.
              </span>
            </fieldset>

            <fieldset>
              <legend className={legendClass}>تكلفة التوصيل (ج.م)</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative block">
                  <input
                    value={draft.startCost}
                    onChange={(e) => setField('startCost', e.target.value)}
                    inputMode="decimal"
                    maxLength={9}
                    className={compactFieldClass}
                  />
                  <Notch compact>البداية</Notch>
                </label>
                <label className="relative block">
                  <input
                    value={draft.costPerKm}
                    onChange={(e) => setField('costPerKm', e.target.value)}
                    inputMode="decimal"
                    maxLength={9}
                    className={compactFieldClass}
                  />
                  <Notch compact>الكيلو</Notch>
                </label>
              </div>
              <span className="mt-1.5 block text-xs text-gray-400">زي أوبر: مبلغ ثابت أول الرحلة، وبعده سعر لكل كيلو.</span>
            </fieldset>

            <label className="relative block">
              <select
                value={draft.homePremisesId}
                onChange={(e) => setField('homePremisesId', e.target.value)}
                className={fieldClass}
              >
                <option value="">لسه متحددش</option>
                {premises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Notch>الجراج</Notch>
              <span className="mt-1.5 block text-xs text-gray-400">المقر اللي العربية بترجعله بعد التوصيل.</span>
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-white/10">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
            >
              {saving ? 'بنحفظ…' : mode === 'add' ? 'إضافة المركبة' : 'حفظ التعديل'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium transition hover:border-gray-400 dark:border-white/15"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
      <DialogCloseButton />
    </dialog>
  );
}
