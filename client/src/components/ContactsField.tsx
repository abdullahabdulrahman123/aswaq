import { useState } from 'react';
import { contactTypeInfo, displayContactValue, MAX_CONTACTS, type Contact, type ContactInput } from '../lib/contacts';
import { ContactDialog } from './ContactDialog';
import { ContactIcon } from './ContactIcon';

interface Props {
  contacts: Contact[];
  /**
   * في صفحة (النشاط، «حسابي») دول بيحفظوا في وصلة على طول وبيرموا لو الحفظ
   * فشل — النافذة بتعرض الخطأ. في فورم (تسجيل النشاط، المقر) بيعدّلوا المسودة
   * بس، والحفظ مع الفورم.
   */
  onAdd: (input: ContactInput) => Promise<void> | void;
  onUpdate: (id: string, input: ContactInput) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  /** مين الأرقام دي — بيظهر في النافذة */
  ownerName?: string;
  /** سطر شرح تحت الزرار */
  hint?: string;
}

/**
 * جهات الاتصال — واجهة واحدة بطلب العميل، بتتحط في ٤ أماكن: تسجيل النشاط،
 * وصفحة النشاط، وفورم المقر مع العنوان، و«حسابي». ليستة بالأرقام، وزرار
 * «إضافة جهة اتصال» بيفتح ContactDialog، والدوسة على أي رقم بتفتحه للتعديل.
 */
export function ContactsField({ contacts, onAdd, onUpdate, onRemove, ownerName, hint }: Props) {
  /** null = مقفولة، 'new' = إضافة، جهة اتصال = تعديلها */
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const current = editing === 'new' ? null : editing;
  const full = contacts.length >= MAX_CONTACTS;

  return (
    <div>
      {contacts.length > 0 && (
        <ul className="mb-2.5 grid gap-2">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                onClick={() => setEditing(contact)}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5 text-start transition hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <ContactIcon type={contact.type} boxed />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-stone-500 dark:text-stone-400">{contactTypeInfo(contact.type).label}</span>
                  {/* الرقم واللينك من الشمال لليمين، ومقصوص لو طويل */}
                  <span dir="ltr" className="block truncate text-right text-sm font-medium tabular-nums">
                    {displayContactValue(contact)}
                  </span>
                </span>
                {/* RTL: «افتح» بيشاور على الشمال */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500 dark:bg-white/5 dark:text-stone-400">
          وصلت لأقصى عدد: {MAX_CONTACTS} جهة اتصال. امسح واحدة عشان تضيف غيرها.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-brand-400 bg-brand-50/70 px-4 py-3.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
        >
          <ContactIcon type="landline" className="h-[18px] w-[18px]" />
          إضافة جهة اتصال
        </button>
      )}
      {hint && <span className="mt-1.5 block text-xs text-stone-400">{hint}</span>}

      <ContactDialog
        open={editing !== null}
        value={current}
        others={contacts.filter((c) => c.id !== current?.id)}
        ownerName={ownerName}
        onSave={async (input) => {
          if (current) await onUpdate(current.id, input);
          else await onAdd(input);
          setEditing(null);
        }}
        onDelete={async () => {
          if (!current) return;
          await onRemove(current.id);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
