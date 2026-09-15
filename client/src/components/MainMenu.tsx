import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDropdown } from '../lib/useDropdown';
import { Notch, fieldClass } from './OutlinedField';

/**
 * القائمة ☰ جنب اللوجو — الأنشطة التجارية.
 * بيانات الحساب والخروج في قائمة صورة الحساب (ProfileMenu).
 */
export function MainMenu() {
  const { user, businesses, businessesLoading, selectedBusiness, selectBusiness } = useAuth();
  const { open, setOpen, wrapRef, close } = useDropdown();

  // الأنشطة محتاجة حساب — الزائر مبيشوفش القائمة دي
  if (!user) return null;

  return (
    <div ref={wrapRef} className="relative">
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
          <Link
            role="menuitem"
            to="/business/new"
            onClick={close}
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
            <div className="border-t border-stone-100 px-4 pb-3 pt-4 dark:border-white/5">
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
                onClick={close}
                className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                صفحة النشاط وعناوينه ←
              </Link>
            </div>
          ) : (
            <div className="border-t border-stone-100 px-4 py-2.5 text-xs text-stone-400 dark:border-white/5">
              {businessesLoading ? 'بنجيب أنشطتك…' : 'معندكش أنشطة تجارية لسه'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
