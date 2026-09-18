import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDropdown } from '../lib/useDropdown';
import { Avatar, personInitial } from './Avatar';

const itemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5';
const sectionClass = 'border-t border-stone-100 py-1 dark:border-white/5';
const headingClass = 'px-4 pb-1 pt-2 text-[11px] font-medium text-stone-400';

/** واحد من الهويات اللي المستخدم يقدر يتعامل بيها — حسابه أو نشاط من أنشطته */
function IdentityOption({
  checked,
  onSelect,
  avatar,
  title,
  subtitle,
}: {
  checked: boolean;
  onSelect: () => void;
  avatar: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      role="menuitemradio"
      aria-checked={checked}
      onClick={onSelect}
      className={`${itemClass} ${checked ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-stone-400">{subtitle}</span>
      </span>
      {checked && (
        <span aria-hidden="true" className="text-brand-700 dark:text-brand-400">
          ✓
        </span>
      )}
    </button>
  );
}

/**
 * «أنا» — أول حاجة على يمين الناڤبار، مكان ☰ القديمة. صورة اللي المستخدم
 * بيتعامل بيه دلوقتي: لوجو النشاط، أو صورته هو لو بحسابه الشخصي (والحرف
 * الأول أو الاختصار لو مفيش صورة). الشكل لوحده بيقول مين ده: الشخص دايرة
 * والنشاط مربع — من غير كلمة «شخصي»، بطلب العميل.
 *
 * المنيو اللي بتفتح منها فيها كل حاجة: التبديل بين حسابه وأنشطته، التحكم في
 * النشاط، الحساب، والوضع الليلي لحد ما «التفضيلات» تتعمل. للزائر: الدخول.
 */
export function IdentityMenu() {
  const { user, businesses, businessesLoading, selectedBusiness, selectBusiness, signIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open, setOpen, wrapRef, close } = useDropdown();

  const userName = user?.name ?? user?.email ?? 'حسابي';
  const userAvatar = (size: number) => (
    <Avatar kind="person" picture={user?.picture} fallback={personInitial(user?.name, user?.email)} size={size} />
  );
  const current = (size: number) =>
    selectedBusiness ? (
      <Avatar kind="business" picture={selectedBusiness.picture} fallback={selectedBusiness.abbreviation} size={size} />
    ) : (
      userAvatar(size)
    );

  // الوضع الليلي هنا مؤقتاً — العميل عنده موضوع «التفضيلات» لسه هيتكلم فيه
  const themeItem = (
    <button role="menuitem" onClick={toggleTheme} className={itemClass}>
      <span aria-hidden="true" className="w-4 text-center">
        {theme === 'dark' ? '☀' : '☾'}
      </span>
      {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          user ? `القائمة — ${selectedBusiness ? selectedBusiness.name : userName}` : 'تسجيل الدخول أو إنشاء حساب'
        }
        className="flex items-center gap-0.5 rounded-xl p-0.5 transition hover:bg-stone-100 dark:hover:bg-white/10"
      >
        {user ? (
          current(34)
        ) : (
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-stone-300 text-stone-600 dark:border-white/15 dark:text-stone-300">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
            </svg>
          </span>
        )}
        {/* «الديل»: بيقول إن الصورة بتفتح منيو */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 text-stone-500 transition-transform dark:text-stone-400 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute start-0 top-full z-40 mt-1.5 max-h-[80vh] w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          {user ? (
            <>
              {/* أنا مين دلوقتي، وده معناه أسعار إيه */}
              <div className="flex items-center gap-3 px-4 py-3">
                {current(40)}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">{selectedBusiness ? selectedBusiness.name : userName}</span>
                    {user.demo && <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">(تجريبي)</span>}
                  </div>
                  <div className="truncate text-xs text-stone-400">
                    {selectedBusiness ? 'نشاط تجاري · أسعار الجملة' : 'حسابك الشخصي · أسعار القطاعي'}
                  </div>
                </div>
              </div>

              {/* التبديل — بس لو فيه أنشطة يتبدّل بينها وبين حسابه */}
              {businesses.length > 0 ? (
                <div role="group" aria-label="اتعامل كـ" className={sectionClass}>
                  <div className={headingClass}>اتعامل كـ</div>
                  <IdentityOption
                    checked={!selectedBusiness}
                    onSelect={() => {
                      selectBusiness(null);
                      close();
                    }}
                    avatar={userAvatar(28)}
                    title={userName}
                    subtitle="حسابك الشخصي"
                  />
                  {businesses.map((b) => (
                    <IdentityOption
                      key={b.accountId}
                      checked={selectedBusiness?.accountId === b.accountId}
                      onSelect={() => {
                        selectBusiness(b.accountId);
                        close();
                      }}
                      avatar={<Avatar kind="business" picture={b.picture} fallback={b.abbreviation} size={28} />}
                      title={b.name}
                      subtitle={b.abbreviation}
                    />
                  ))}
                </div>
              ) : (
                businessesLoading && <div className="px-4 pb-2.5 text-xs text-stone-400">بنجيب أنشطتك…</div>
              )}

              {/* تحكم في النشاط اللي بيتعامل بيه — الأصناف والعناوين */}
              {selectedBusiness && (
                <div className={sectionClass}>
                  <div className={headingClass}>تحكم في النشاط</div>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}/items`} onClick={close} className={itemClass}>
                    الأصناف
                  </Link>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}/items/new`} onClick={close} className={itemClass}>
                    إضافة صنف
                  </Link>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}`} onClick={close} className={itemClass}>
                    صفحة النشاط واللوجو والعناوين
                  </Link>
                </div>
              )}

              <div className={sectionClass}>
                <Link role="menuitem" to="/business/new" onClick={close} className={itemClass}>
                  أنشئ نشاط تجاري
                </Link>
                <Link role="menuitem" to="/account" onClick={close} className={itemClass}>
                  حسابي
                </Link>
                {themeItem}
              </div>

              <div className={sectionClass}>
                <button
                  role="menuitem"
                  onClick={() => {
                    close();
                    signOut();
                  }}
                  className={itemClass}
                >
                  تسجيل الخروج
                </button>
              </div>
            </>
          ) : (
            <>
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
              <div className={sectionClass}>{themeItem}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
