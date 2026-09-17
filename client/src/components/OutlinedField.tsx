import type { ReactNode } from 'react';

/**
 * شكل الخانات في أسواق: إطار واسم قاعد على الإطار نفسه.
 *
 * الاتنين اللي هنا بيشتغلوا مع بعض — الخانة بتاخد fieldClass والاسم بييجي
 * بعدها على طول جوه عنصر فيه relative:
 *
 *   <label className="relative block">
 *     <input className={fieldClass} />
 *     <Notch>الشارع</Notch>
 *   </label>
 *
 * الترتيب مهم: peer-focus بيشتغل على العنصر اللي *بعد* الخانة بس.
 */

/**
 * peer عشان الاسم يغيّر لونه لما الخانة تبقى في التركيز. ring-inset بيتخن
 * الإطار من جوه بدل ما يزوّد عرض العنصر — الإطار التقيل لو زوّد بكسل واحد
 * كانت الخانات هتنطّ وإحنا بننقّل بينها.
 */
const fieldBase =
  'peer w-full rounded-xl border border-stone-300 bg-transparent outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-inset focus:ring-brand-500 dark:border-white/20';

export const fieldClass = `${fieldBase} px-3 py-3`;

/**
 * خانة ضيقة — لما خانتين أو أربعة بيبقوا في صف واحد على الموبايل
 * (وحدات الصنف). استخدمها مع <Notch compact>.
 */
export const compactFieldClass = `${fieldBase} px-2 py-2.5 text-sm`;

/**
 * اسم الخانة، قاعد على خط الإطار.
 *
 * الفتحة في الإطار مش فتحة حقيقية — خلفية الاسم هي نفس خلفية الكارت اللي
 * الخانة قاعدة عليه، فبتغطّي الخط تحتها. يعني لو خلفية الكارت اتغيّرت لازم
 * تتغيّر هنا كمان.
 */
export function Notch({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute -top-2 whitespace-nowrap bg-white font-medium text-stone-500 transition-colors peer-focus:text-brand-600 peer-disabled:text-stone-400 dark:bg-surface-card dark:text-stone-400 dark:peer-focus:text-brand-400 ${
        compact ? 'start-1.5 px-0.5 text-[11px]' : 'start-3 px-1 text-xs'
      }`}
    >
      {children}
    </span>
  );
}
