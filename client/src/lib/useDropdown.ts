import { useEffect, useRef, useState } from 'react';

/**
 * فتح وقفل قايمة منسدلة من الناڤبار: بتقفل لو المستخدم داس برّه أو داس Escape.
 * القايمة ممكن توقف Escape قبل ما يوصل هنا (ليستة «حساباتي» في IdentityMenu
 * بتتقفل بيه هي الأول بدل المنيو كلها).
 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, wrapRef, close: () => setOpen(false) };
}
