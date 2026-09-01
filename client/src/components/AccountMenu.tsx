import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { waslaAccountUrl, waslaConfigured } from '../lib/waslaAuth';

/**
 * أسواق مبيخزّنش حسابات — الحساب نفسه عايش في وصلة.
 * فإدارة الحساب ومسحه بيتمّوا هناك، وإحنا بنوصّل المستخدم لهم.
 */
export function AccountMenu() {
  const { user, signOut } = useAuth();
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

          {waslaConfigured ? (
            <>
              <a
                role="menuitem"
                href={`${waslaAccountUrl()}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-white/5"
              >
                إدارة حسابي في وصلة ↗
              </a>
              <a
                role="menuitem"
                href={`${waslaAccountUrl()}/sessions`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-white/5"
              >
                الأجهزة والجلسات ↗
              </a>
              <a
                role="menuitem"
                href={`${waslaAccountUrl()}/profile#delete`}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-stone-200 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                مسح الحساب نهائياً ↗
              </a>
            </>
          ) : (
            <p className="border-b border-stone-200 px-4 py-3 text-xs leading-relaxed text-stone-400 dark:border-white/10">
              إدارة الحساب ومسحه بيتمّوا في وصلة — مش متاحين في النسخة التجريبية دي.
            </p>
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
