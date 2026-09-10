import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** أقصى عدد نشاطات بتظهر أسماؤها في القائمة قبل ما نختصر */
const MAX_IN_MENU = 5;

/** قائمة الحساب — كل حاجة تخص المستخدم جوه أسواق */
export function AccountMenu() {
  const { user, businesses, signOut } = useAuth();
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

  if (!user) return null;

  const label = user.name ?? user.email ?? 'حسابي';

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[160px] items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium hover:border-brand-400 dark:border-white/15"
      >
        <span className="truncate">{label}</span>
        {user.demo && <span className="shrink-0 text-amber-600 dark:text-amber-400">(تجريبي)</span>}
        <span aria-hidden="true" className="shrink-0 text-stone-400">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          <div className="border-b border-stone-200 px-4 py-3 dark:border-white/10">
            <div className="truncate text-sm font-semibold">{label}</div>
            {user.email && <div className="truncate text-xs text-stone-400">{user.email}</div>}
          </div>

          <Link
            role="menuitem"
            to="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-white/5"
          >
            حسابي
          </Link>

          <Link
            role="menuitem"
            to="/business/new"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-white/5"
          >
            أنشئ نشاط تجاري
          </Link>

          {/*
            الزرار ده عنوان للمجموعة اللي تحته — الدخول على نشاط بيبقى من
            اسمه نفسه، ووجهته لسه بتتحدد. فمفيش صفحة وراه.
          */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span>نشاطاتي التجارية</span>
            {businesses.length > 0 && (
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums text-stone-500 dark:bg-white/10 dark:text-stone-400">
                {businesses.length}
              </span>
            )}
          </div>

          {/*
            أسماء النشاطات — دي هي مدخل الدخول على صفحة النشاط، اللي منها
            بيتضافوا العناوين.
            بنعرض أول MAX_IN_MENU وبس: دي قائمة منسدلة من الناڤبار، ولو
            المستخدم عنده عشرين نشاط هتطوّل لحد ما تخرج بره الشاشة.
          */}
          {businesses.length > 0 && (
            <ul className="border-b border-stone-100 pb-1.5 dark:border-white/5">
              {businesses.slice(0, MAX_IN_MENU).map((b) => (
                <li key={b.id}>
                  <Link
                    role="menuitem"
                    to={`/business/${b.id}`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 py-1.5 pe-4 ps-8 text-start text-sm text-stone-600 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5"
                  >
                    <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 font-display text-[11px] font-bold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
                      {b.abbreviation}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </Link>
                </li>
              ))}

              {businesses.length > MAX_IN_MENU && (
                <li className="py-1.5 pe-4 ps-8 text-xs text-stone-400">
                  وكمان {businesses.length - MAX_IN_MENU}…
                </li>
              )}
            </ul>
          )}

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full border-t border-stone-200 px-4 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}
