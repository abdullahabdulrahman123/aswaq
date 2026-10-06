import { useRef, type MouseEvent } from 'react';

/**
 * قفل النوافذ بطلب العميل (٣٠ سبتمبر): زرار X فوق، والدوسة برا النافذة. الاتنين
 * زي Esc بالظبط — مبيحفظوش حاجة، و«تم»/«حفظ» بس هو اللي بيحفظ.
 */

/**
 * X في ركن النافذة فوق على الشمال. آخر حاجة في الـ<dialog> ومتثبّت بـabsolute:
 * التركيز الأول لما النافذة تفتح بيفضل على أول خانة زي ما كان، والـX بيفضل
 * ظاهر لو المحتوى اتسكرول. من غير onClick بيقفل الـ<dialog> اللي هو فيه.
 */
export function DialogCloseButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="اقفل"
      title="اقفل"
      onClick={(e) => (onClick ? onClick() : e.currentTarget.closest('dialog')?.close())}
      className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

/**
 * الدوسة على الخلفية المعتمة بتقفل الـ<dialog>. الدوسة لازم تبدأ وتخلص برا:
 * اللي بيحدد كلام في خانة ويسيب الماوس برا مش عايز يقفل. والـtarget لازم يكون
 * الـ<dialog> نفسه — الدوسة على نافذة فوقها (زي «حدد العنوان» فوق المقر)
 * بتعدّي عليها في شجرة React.
 */
export function useBackdropClose() {
  const pressedOutside = useRef(false);
  return {
    onPointerDown: (e: MouseEvent<HTMLDialogElement>) => {
      pressedOutside.current = isBackdrop(e);
    },
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      if (pressedOutside.current && isBackdrop(e)) e.currentTarget.close();
      pressedOutside.current = false;
    },
  };
}

function isBackdrop(e: MouseEvent<HTMLDialogElement>) {
  if (e.target !== e.currentTarget) return false;
  const box = e.currentTarget.getBoundingClientRect();
  return e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
}
