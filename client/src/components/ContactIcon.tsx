import type { ReactElement } from 'react';
import type { ContactType } from '../lib/contacts';

/** رسمة كل نوع (خطوط زي PinIcon) */
const PATHS: Record<ContactType, ReactElement> = {
  mobile: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.5h2" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3.5 20.5l1.3-4a8.5 8.5 0 1 1 3.3 3.1z" />
      <path d="M9.2 8.6c.2-.4.5-.5.8-.5h.4c.2 0 .3.1.4.3l.6 1.4c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.4 1.9 2.5 2.5l.6-.5c.2-.1.4-.2.6-.1l1.4.6c.2.1.3.2.3.4v.4c0 .3-.1.6-.5.8-.5.3-1.3.4-2.4-.1a8.4 8.4 0 0 1-3.9-3.9c-.5-1.1-.4-1.9-.2-2.5z" />
    </>
  ),
  landline: (
    <path d="M21 16.4v2.8a2 2 0 0 1-2.2 2 18.3 18.3 0 0 1-8-2.8 18 18 0 0 1-5.5-5.5 18.3 18.3 0 0 1-2.8-8A2 2 0 0 1 4.5 2.6h2.8a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8.3 10.2a15 15 0 0 0 5.5 5.5L15 14.5a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
  ),
  short_number: <path d="M5 9h15M4 15h15M10.5 3.5 8.5 20.5M15.5 3.5l-2 17" />,
  facebook: <path d="M16.5 3h-2.7a4.3 4.3 0 0 0-4.3 4.3V10H7v3.5h2.5V21h3.6v-7.5h2.6l.8-3.5h-3.4V7.6c0-.6.4-1 1-1h2.4z" />,
};

/** لون خلفية الأيقونة: الواتساب أخضر وفيسبوك أزرق زي ما الناس عارفينهم، والأرقام رمادي */
const TINTS: Record<ContactType, string> = {
  mobile: 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300',
  landline: 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300',
  short_number: 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300',
  whatsapp: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  facebook: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
};

/** أيقونة نوع جهة الاتصال. boxed = جوه مربع ملوّن (في الليستة) */
export function ContactIcon({ type, boxed = false, className = '' }: { type: ContactType; boxed?: boolean; className?: string }) {
  const svg = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={boxed ? 'h-[18px] w-[18px]' : className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[type]}
    </svg>
  );
  if (!boxed) return svg;
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TINTS[type]} ${className}`}>{svg}</span>;
}
