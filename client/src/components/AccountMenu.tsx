import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notch, fieldClass } from './OutlinedField';

/** قائمة الحساب — كل حاجة تخص المستخدم جوه أسواق */
export function AccountMenu() {
  const { user, businesses, businessesLoading, selectedBusiness, selectBusiness, signOut } = useAuth();
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
      {/* زرار ☰ جنب اللوجو — اسم الحساب بقى جوه القائمة نفسها */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="القائمة"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute start-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          <div className="border-b border-stone-200 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="truncate">{label}</span>
              {user.demo && <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">(تجريبي)</span>}
            </div>
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
            النشاط المختار — المستخدم بيشتغل بنشاط واحد في المرة، واللي جاي
            (المحلات والأصناف) هيتبني عليه.
            قايمة منسدلة من المتصفح نفسه: على الموبايل بتفتح منتقي النظام،
            ومهما كان عدد الأنشطة القائمة مبتطوّلش.
          */}
          {selectedBusiness ? (
            <div className="px-4 pb-3 pt-4">
              <label className="relative block">
                <select
                  value={selectedBusiness.accountId}
                  onChange={(e) => selectBusiness(e.target.value)}
                  className={`${fieldClass} text-sm`}
                >
                  {businesses.map((b) => (
                    <option key={b.accountId} value={b.accountId}>
                      {b.abbreviation} — {b.name}
                    </option>
                  ))}
                </select>
                <Notch>النشاط التجاري</Notch>
              </label>
              {/* الأسماء كانت هي المدخل لصفحة النشاط — دلوقتي اللينك ده */}
              <Link
                role="menuitem"
                to={`/business/${selectedBusiness.accountId}`}
                onClick={() => setOpen(false)}
                className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                صفحة النشاط وعناوينه ←
              </Link>
            </div>
          ) : (
            <div className="px-4 py-2.5 text-xs text-stone-400">
              {businessesLoading ? 'بنجيب أنشطتك…' : 'معندكش أنشطة تجارية لسه'}
            </div>
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
