import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from './AccountMenu';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signIn } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface-light/95 backdrop-blur dark:border-white/10 dark:bg-surface-dark/95">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-baseline gap-1.5 font-display text-2xl font-bold text-brand-700 dark:text-brand-400">
          أسواق
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="تبديل المظهر"
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-white/15"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* الحساب — التسجيل كله عبر وصلة */}
          {user ? (
            <AccountMenu />
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => signIn('login')}
                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium transition hover:border-brand-400 dark:border-white/15"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => signIn('register')}
                className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                إنشاء حساب
              </button>
            </div>
          )}

        </div>
      </nav>

    </header>
  );
}
