import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from './AccountMenu';
import { vendorById } from '../data/catalog';

const navLinks = [{ to: '/products', label: 'كل المنتجات' }];

export function Navbar() {
  const { count, vendorId } = useCart();
  const cartVendor = vendorId ? vendorById(vendorId) : undefined;
  const { theme, toggleTheme } = useTheme();
  const { user, openGate } = useAuth();
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
            <button
              onClick={() => openGate('login')}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              تسجيل الدخول
            </button>
          )}

          <Link
            to="/cart"
            title={cartVendor ? `سلتك من ${cartVendor.name}` : undefined}
            className="relative rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            السلة
            {count > 0 && (
              <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white tnum">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pb-2">
        <div className="no-scrollbar flex gap-4 overflow-x-auto text-sm">
          {navLinks.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 pb-1.5 transition ${
                  isActive
                    ? 'border-brand-500 text-brand-700 dark:text-brand-400'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                }`
              }
              end
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
