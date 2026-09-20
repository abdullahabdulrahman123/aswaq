import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  CONTACT_TYPES,
  contactTypeInfo,
  editableContactValue,
  normalizeContactValue,
  type Contact,
  type ContactInput,
} from '../lib/contacts';
import { ApiError } from '../lib/waslaApi';
import { ContactIcon } from './ContactIcon';
import { Notch, fieldClass } from './OutlinedField';

interface Props {
  open: boolean;
  /** جهة الاتصال الحالية في التعديل. null = إضافة */
  value: Contact | null;
  /** الموجودين غيرها — عشان نفس الرقم مرتين يتقفش هنا قبل وصلة */
  others: Contact[];
  /** مين الأرقام دي — «فرع المنصورة»، بيظهر تحت العنوان لو موجود */
  ownerName?: string;
  /** في صفحة: بيخلص لما وصلة ترد، وبيرمي لو الحفظ فشل. في فورم: بيرجّع على طول */
  onSave: (input: ContactInput) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
}

/** رسالة خطأ الحفظ اللي جاية من وصلة */
function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return 'جهة الاتصال دي متضافة قبل كده.';
  return err instanceof Error ? err.message : 'مقدرناش نحفظ. جرّب تاني.';
}

/**
 * «إضافة جهة اتصال» — نوع وقيمة. نفس النافذة في الأربع أماكن اللي ContactsField
 * بيتحط فيها.
 *
 * بتترسم جوه body مش مكانها: ممكن تتفتح من جوه نافذة المقر، وكده الاتنين
 * <dialog> جنب بعض مش واحدة جوه التانية، زي «حدد العنوان». وأحداث القفل
 * بتقف عندها — React بيعدّي onClose من هنا لأي <dialog> فوقها في الشجرة، وكانت
 * نافذة المقر هتتقفل معاها. ومفيش <form> هنا لنفس السبب: إرسالها كان هيوصل
 * لفورم تسجيل النشاط اللي فوقها.
 */
export function ContactDialog({ open, value, others, ownerName, onSave, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // اسم مجموعة الأنواع: الراديو اللي من غير فورم بيتجمّع على مستوى الصفحة كلها
  const typeGroup = useId();

  const [type, setType] = useState(value?.type ?? 'mobile');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // كل فتحة تبدأ من المحفوظ — الإلغاء بيسيب الأصل زي ما هو
  useEffect(() => {
    if (!open) return;
    setType(value?.type ?? 'mobile');
    setText(value ? editableContactValue(value) : '');
    setError('');
    setSaving(false);
    setConfirmingDelete(false);
    setDeleting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const info = contactTypeInfo(type);
  const busy = saving || deleting;

  async function handleSave() {
    if (busy) return;
    if (!text.trim()) {
      setError(`اكتب ${info.field}.`);
      return;
    }
    const normalized = normalizeContactValue(type, text);
    if (normalized === null) {
      setError(info.error);
      return;
    }
    if (others.some((c) => c.type === type && c.value === normalized)) {
      setError('جهة الاتصال دي متضافة قبل كده.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ type, value: normalized });
    } catch (err) {
      setError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مقدرناش نمسح. جرّب تاني.');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  /** القفل هنا ميوصلش لنافذة المقر اللي فوقها في شجرة React */
  function stop(event: SyntheticEvent) {
    event.stopPropagation();
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      onCancel={stop}
      onClose={(event) => {
        stop(event);
        onClose();
      }}
      aria-label={value ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}
      // العرض في style مش كلاس — نفس سبب AddressDialog
      style={{ width: 'min(30rem, 92vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="font-display text-lg font-bold">{value ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}</h2>
          {ownerName && <p className="mt-1 text-xs text-stone-400">أرقام «{ownerName}».</p>}

          <fieldset className="mt-5">
            <legend className="mb-2 block text-xs font-medium text-stone-500 dark:text-stone-400">النوع</legend>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TYPES.map((option) => (
                <label
                  key={option.type}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                    option.type === type
                      ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'border-stone-300 hover:border-stone-400 dark:border-white/15 dark:hover:border-white/30'
                  }`}
                >
                  <input
                    type="radio"
                    name={typeGroup}
                    value={option.type}
                    checked={option.type === type}
                    onChange={() => {
                      setType(option.type);
                      setError('');
                    }}
                    className="sr-only"
                  />
                  <ContactIcon type={option.type} className="h-4 w-4 shrink-0" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="relative mt-6 block">
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              // الأرقام واللينكات بتتقري من الشمال لليمين حتى في صفحة عربي
              dir="ltr"
              inputMode={info.inputMode}
              type={info.inputMode === 'url' ? 'url' : 'text'}
              autoComplete={info.inputMode === 'url' ? 'url' : 'tel'}
              maxLength={300}
              placeholder={info.placeholder}
              className={`${fieldClass} text-left`}
            />
            <Notch>{info.field}</Notch>
            <span className="mt-1.5 block text-xs text-stone-400">{info.hint}</span>
          </label>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-progress disabled:opacity-70"
            >
              {saving ? 'بنحفظ…' : value ? 'حفظ' : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
            >
              إلغاء
            </button>
          </div>

          {value && (
            <div className="mt-4 text-sm">
              {confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-500/10">
                  <span className="flex-1 text-red-700 dark:text-red-300">جهة الاتصال دي هتتمسح. متأكد؟</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                  >
                    {deleting ? 'بنمسح…' : 'أيوه، امسح'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={busy}
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
                  امسح جهة الاتصال
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
