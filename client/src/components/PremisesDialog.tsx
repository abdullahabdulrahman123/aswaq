import { useEffect, useRef, useState } from 'react';
import type { Premises } from '../context/AuthContext';
import { oneLine } from '../lib/address';
import { AddressDialog, EMPTY_ADDRESS } from './AddressDialog';
import { MapPreview } from './MapPreview';
import { Notch, fieldClass } from './OutlinedField';
import { PinIcon } from './PinIcon';

/** المسودة اللي بتبدأ بيها أي إضافة — النوع من غير اختيار عشان يختاره بنفسه، والعنوان لسه متحددش */
export const EMPTY_PREMISES: Premises = { id: '', name: '', isStore: false, isWarehouse: false, address: null };

/** بترتيب كلام العميل: «مخزن أو متجر أو الاتنين» */
const KINDS = [
  { key: 'isWarehouse', label: 'مخزن' },
  { key: 'isStore', label: 'متجر' },
] as const;

const legendClass = 'mb-2 block text-xs font-medium text-stone-500 dark:text-stone-400';

interface Props {
  open: boolean;
  /** المقر الحالي — بيتنسخ لمسودة جوه النافذة */
  value: Premises;
  /** بيغيّر العنوان والزرار، وبيظهر المسح في التعديل بس */
  mode: 'add' | 'edit';
  /** بيخلص لما وصلة ترد، وبيرمي لو الحفظ فشل — النافذة بتعرض الخطأ وتفضل مفتوحة */
  onSave: (premises: Premises) => Promise<void>;
  /** التعديل بس. بيرمي لو المسح فشل */
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

/**
 * فورم المقر — صفحة واحدة، بطلب العميل: اسمه، ونوعه، وعنوانه. النوع هنا مش في
 * العنوان عشان بيتغيّر مع الوقت (مخزن يبقى مخزن ومتجر). العنوان خاصية من
 * خواص المقر وإجباري: «حدد العنوان» بيفتح الخريطة وتفاصيله، و«تم» بيرجّعه هنا،
 * والمقر وعنوانه بيتحفظوا مع بعض.
 *
 * نافذة «حدد العنوان» جنب النافذة دي مش جواها: الاتنين <dialog>، والتانية
 * بتطلع فوق الأولى لوحدها، وEsc بيقفل اللي فوق بس.
 */
export function PremisesDialog({ open, value, mode, onSave, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [draft, setDraft] = useState<Premises>(value);
  const [pickingAddress, setPickingAddress] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // فتح وقفل النافذة الأصلية بالتزامن مع الحالة
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة تبدأ من المقر المحفوظ — عشان الإلغاء يرجّع الأصل فعلاً
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setPickingAddress(false);
    setError('');
    setSaving(false);
    setConfirmingDelete(false);
    setDeleting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setField<K extends keyof Premises>(key: K, v: Premises[K]) {
    setDraft((prev) => ({ ...prev, [key]: v }));
    setError('');
  }

  async function handleSave() {
    if (saving) return;
    const name = draft.name.trim();
    if (!name) {
      setError('اكتب اسم المقر.');
      return;
    }
    if (!draft.isStore && !draft.isWarehouse) {
      setError('اختار نوع المقر: مخزن أو متجر أو الاتنين.');
      return;
    }
    if (!draft.address) {
      setError('حدد عنوان المقر.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ ...draft, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مقدرناش نحفظ المقر. جرّب تاني.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مقدرناش نمسح المقر. جرّب تاني.');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        // الإغلاق ممكن ييجي من Esc كمان، مش من زرار الإلغاء بس
        onClose={onClose}
        aria-label={mode === 'add' ? 'إضافة مقر' : 'تعديل المقر'}
        // العرض في style مش كلاس — نفس سبب AddressDialog
        style={{ width: 'min(38rem, 92vw)' }}
        className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
      >
        {open && (
          <div className="max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-display text-lg font-bold">{mode === 'add' ? 'إضافة مقر' : 'تعديل المقر'}</h2>

            {/* gap أوسع من العادي: اسم كل خانة طالع فوق حدّها بـ٨ بكسل */}
            <div className="mt-6 grid gap-5">
              <label className="relative block">
                <input
                  value={draft.name}
                  onChange={(e) => setField('name', e.target.value)}
                  maxLength={60}
                  placeholder="مثال: شركة الهلال فرع المنصورة"
                  className={fieldClass}
                />
                <Notch>اسم المقر</Notch>
                <span className="mt-1.5 block text-xs text-stone-400">اسم يفرّقه عن باقي مقراتك.</span>
              </label>

              {/* مربعات مش اختيار واحد — نفس المكان ممكن يبقى الاتنين */}
              <fieldset>
                <legend className={legendClass}>نوع المقر</legend>
                <div className="grid grid-cols-2 gap-3">
                  {KINDS.map(({ key, label }) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        draft[key]
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'border-stone-300 hover:border-stone-400 dark:border-white/15 dark:hover:border-white/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={draft[key]}
                        onChange={(e) => setField(key, e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-brand-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <span className="mt-1.5 block text-xs text-stone-400">
                  تقدر تختار الاتنين لو نفس المكان مخزن ومتجر مع بعض.
                </span>
              </fieldset>

              <div role="group" aria-label="العنوان">
                <span className={legendClass}>العنوان</span>
                {draft.address ? (
                  <div className="overflow-hidden rounded-xl border border-stone-300 dark:border-white/15">
                    <MapPreview lat={draft.address.lat} lng={draft.address.lng} />
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <PinIcon className="h-[18px] w-[18px] shrink-0 text-brand-600 dark:text-brand-400" />
                      <span className="min-w-0 flex-1 text-sm leading-relaxed">
                        {oneLine(draft.address) || 'عنوان من غير تفاصيل'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickingAddress(true)}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
                      >
                        غيّر العنوان
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPickingAddress(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-brand-400 bg-brand-50/70 px-4 py-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                    >
                      <PinIcon className="h-[18px] w-[18px]" />
                      حدد العنوان
                    </button>
                    <span className="mt-1.5 block text-xs text-stone-400">
                      مكان المقر على الخريطة وتفاصيله — لازم لكل مقر.
                    </span>
                  </>
                )}
              </div>
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
                disabled={saving || deleting}
                className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
              >
                {saving ? 'بنحفظ…' : mode === 'add' ? 'إضافة المقر' : 'حفظ التعديل'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
              >
                إلغاء
              </button>
            </div>

            {mode === 'edit' && onDelete && (
              <div className="mt-4 text-sm">
                {confirmingDelete ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-500/10">
                    <span className="flex-1 text-red-700 dark:text-red-300">المقر وعنوانه هيتمسحوا. متأكد؟</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                    >
                      {deleting ? 'بنمسح…' : 'أيوه، امسح'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium dark:border-white/15"
                    >
                      لأ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="font-medium text-red-600 transition hover:text-red-700 dark:text-red-400"
                  >
                    امسح المقر
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </dialog>

      <AddressDialog
        open={open && pickingAddress}
        value={draft.address ?? EMPTY_ADDRESS}
        premisesName={draft.name.trim()}
        onDone={(address) => {
          setDraft((prev) => ({ ...prev, address }));
          setPickingAddress(false);
          setError('');
        }}
        onClose={() => setPickingAddress(false)}
      />
    </>
  );
}
