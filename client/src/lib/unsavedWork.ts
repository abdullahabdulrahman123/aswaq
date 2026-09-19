import { useEffect } from 'react';

/**
 * شغل لسه متحفظش في الصفحة المفتوحة — دلوقتي فورم الصنف بس. تبديل الحساب من
 * المنيو بيسأل قبل ما يضيّعه، بطلب العميل.
 *
 * متغيّر عادي مش state: المنيو محتاجة تعرفه لحظة الدوسة بس، ومفيش داعي حاجة
 * تترسم من جديد مع كل حرف بيتكتب.
 */
let unsaved = false;

export function useUnsavedWork(dirty: boolean) {
  useEffect(() => {
    unsaved = dirty;
    return () => {
      unsaved = false;
    };
  }, [dirty]);
}

export const hasUnsavedWork = () => unsaved;
