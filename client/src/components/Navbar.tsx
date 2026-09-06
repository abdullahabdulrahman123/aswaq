import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from './AccountMenu';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface-light/95 backdrop-blur dark:border-white/10 dark:bg-surface-dark/95">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-baseline gap-1.5 font-display text-2xl font-bold text-brand-700 dark:text-brand-400">
          أسواق
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        </Link>

        <form onSubmit={submitSearch} className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-1">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="دوّر على منتج أو شركة…"
              aria-label="بحث في المنتجات"
              className="w-full rounded-xl border border-stone-300 bg-white py-2 pe-4 ps-10 text-sm placeholder:text-stone-400 focus:border-brand-500 dark:border-white/15 dark:bg-surface-card dark:placeholder:text-stone-500"
            />
            <svg className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-stone-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
          </div>
        </form>

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
