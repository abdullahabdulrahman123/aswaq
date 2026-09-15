import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDropdown } from '../lib/useDropdown';

/** أول حرف من الاسم — مكان صورة الحساب، لأن وصلة لسه مبتبعتش صور */
function initialOf(name: string | undefined, email: string | undefined): string {
  const source = (name ?? email ?? '').trim();
  return source ? Array.from(source)[0].toUpperCase() : '';
}

const itemClass = 'block w-full px-4 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5';

/**
 * قائمة صورة الحساب — آخر الناڤبار.
 * للمسجّل: اسمه، وحسابي، والخروج. للزائر: الدخول وإنشاء الحساب (التسجيل كله عبر وصلة).
 */
export function ProfileMenu() {
  const { user, signIn, signOut } = useAuth();
  const { open, setOpen, wrapRef, close } = useDropdown();

  const initial = user ? initialOf(user.name, user.email) : '';

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={user ? 'قائمة حسابي' : 'تسجيل الدخول أو إنشاء حساب'}
        className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition ${
          user?.picture || initial
            ? 'hover:ring-2 hover:ring-brand-300'
            : 'border border-stone-300 text-stone-600 hover:border-brand-400 dark:border-white/15 dark:text-stone-300'
        }`}
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="h-full w-full object-cover" />
        ) : initial ? (
          <span className="flex h-full w-full items-center justify-center bg-brand-500 font-display text-sm font-bold text-white">
            {initial}
          </span>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          {user ? (
            <>
              <div className="border-b border-stone-200 px-4 py-3 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{user.name ?? user.email ?? 'حسابي'}</span>
                  {user.demo && <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">(تجريبي)</span>}
                </div>
                {user.email && <div className="truncate text-xs text-stone-400">{user.email}</div>}
              </div>

              <Link role="menuitem" to="/account" onClick={close} className={itemClass}>
                حسابي
              </Link>

              <button
                role="menuitem"
                onClick={() => {
                  close();
                  signOut();
                }}
                className={`${itemClass} border-t border-stone-200 dark:border-white/10`}
              >
                تسجيل الخروج
              </button>
            </>
          ) : (
            <div className="space-y-2 p-3">
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  signIn('login');
                }}
                className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium transition hover:border-brand-400 dark:border-white/15"
              >
                تسجيل الدخول
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  signIn('register');
                }}
                className="block w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                إنشاء حساب
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
