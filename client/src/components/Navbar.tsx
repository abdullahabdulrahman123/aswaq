import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { CartIcon } from './CartIcon';
import { MainMenu } from './MainMenu';
import { ProfileMenu } from './ProfileMenu';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface-light/95 backdrop-blur dark:border-white/10 dark:bg-surface-dark/95">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {/* قائمة الأنشطة (☰) جنب اللوجو — بتظهر بس للمسجّل */}
          <MainMenu />
          <Link to="/" className="flex items-baseline gap-1.5 font-display text-2xl font-bold text-brand-700 dark:text-brand-400">
            أسواق
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="تبديل المظهر"
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-white/15"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* العربة — صفحتها لسه «قريباً»، وهيبقى فيها طلباتي */}
          <Link
            to="/orders"
            aria-label="طلباتي"
            title="طلباتي"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10"
          >
            <CartIcon className="h-6 w-6" />
          </Link>

          {/* صورة الحساب — الدخول والتسجيل للزائر، وحسابي والخروج للمسجّل */}
          <ProfileMenu />
        </div>
      </nav>
    </header>
  );
}
