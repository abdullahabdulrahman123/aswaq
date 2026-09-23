import { useState, type ReactNode } from 'react';
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
  /** عنوان الجزء — زرار الإضافة بيتحط جنبه، زي «إضافة مقر» */
  heading: ReactNode;
  /** مين الأرقام دي — بيظهر في النافذة */
  ownerName?: string;
  /** سطر شرح تحت الزرار */
  hint?: string;
}

/**
 * جهات الاتصال — واجهة واحدة بطلب العميل، بتتحط في ٤ أماكن: تسجيل النشاط،
 * وصفحة النشاط، وفورم المقر مع العنوان، و«حسابي». العنوان وجنبه زرار
 * «إضافة جهة اتصال» بيفتح ContactDialog، وتحتهم ليستة بالأرقام، والدوسة على
 * أي رقم بتفتحه للتعديل.
 */
export function ContactsField({ contacts, onAdd, onUpdate, onRemove, heading, ownerName, hint }: Props) {
  /** null = مقفولة، 'new' = إضافة، جهة اتصال = تعديلها */
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const current = editing === 'new' ? null : editing;
  const full = contacts.length >= MAX_CONTACTS;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{heading}</div>
        {!full && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
          >
            ＋ إضافة جهة اتصال
          </button>
        )}
      </div>

      {contacts.length > 0 ? (
        <ul className="mt-3 grid gap-2">
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
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-4 text-center text-sm text-stone-400 dark:border-white/15">
          مفيش جهات اتصال لسه.
        </p>
      )}

      {full && (
        <p className="mt-2.5 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500 dark:bg-white/5 dark:text-stone-400">
          وصلت لأقصى عدد: {MAX_CONTACTS} جهة اتصال. امسح واحدة عشان تضيف غيرها.
        </p>
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
