import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { pathAfterSwitch } from '../lib/businessRoutes';
import { hasUnsavedWork } from '../lib/unsavedWork';
import { useDropdown } from '../lib/useDropdown';
import { Avatar, personInitial } from './Avatar';
import { Notch } from './OutlinedField';
import { UnsavedSwitchDialog } from './UnsavedSwitchDialog';

const itemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5';
const sectionClass = 'border-t border-stone-100 py-1 dark:border-white/5';
const headingClass = 'px-4 pb-1 pt-2 text-[11px] font-medium text-stone-400';
/** سطر في ليستة «حساباتي» */
const rowClass =
  'flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-stone-50 dark:hover:bg-white/5';
/**
 * الإيميل ltr عشان لو طويل يتقص من آخره (…@gmail.com) مش من أوله، ويفضل
 * على اليمين زي باقي المنيو.
 */
const emailClass = 'block truncate text-right text-xs text-stone-400';

/** حساب في ليستة «حساباتي» — حساب المستخدم نفسه أو نشاط من أنشطته */
function AccountOption({
  checked,
  onSelect,
  avatar,
  title,
  subtitle,
  subtitleIsEmail = false,
}: {
  checked: boolean;
  onSelect: () => void;
  avatar: ReactNode;
  title: string;
  subtitle?: string;
  subtitleIsEmail?: boolean;
}) {
  return (
    <button
      role="menuitemradio"
      aria-checked={checked}
      onClick={onSelect}
      className={`${rowClass} ${checked ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle &&
          (subtitleIsEmail ? (
            <span dir="ltr" className={emailClass}>
              {subtitle}
            </span>
          ) : (
            <span className="block truncate text-xs text-stone-400">{subtitle}</span>
          ))}
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
 * المنيو اللي بتفتح منها، زي ما العميل وافق عليها (شبه ليستة الحسابات في جوجل):
 *   ١) كارت المستخدم: صورته واسمه وتحته الإيميل — بيفتح «حسابي»
 *   ٢) خانة «حساباتي» زي خانات الفورم (اسمها على الإطار)، فيها الحساب اللي
 *      شغال بيه دلوقتي، وبتفتح ليستة: حسابه، وأنشطته، و«أنشئ نشاط تجاري»
 *   ٣) التحكم في النشاط، والوضع الليلي لحد ما «التفضيلات» تتعمل، والخروج
 * مفيش هنا أي كلمة جملة أو قطاعي: ده تصنيف داخلي، والمشتري بيشوف «السعر» وبس.
 * للزائر: الدخول.
 *
 * تغيير الحساب وإنت في صفحة نشاط بيودّيك لنفس الصفحة للحساب الجديد
 * (lib/businessRoutes)، وبيسأل الأول لو فيه صنف لسه متحفظش.
 */
export function IdentityMenu() {
  const { user, businesses, businessesLoading, selectedBusiness, selectBusiness, signIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open, setOpen, wrapRef, close } = useDropdown();
  // ليستة «حساباتي» بتبدأ مقفولة كل ما المنيو تفتح
  const [accountsOpen, setAccountsOpen] = useState(false);
  const accountsButton = useRef<HTMLButtonElement>(null);
  const accountsId = useId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  /** تغيير حساب مستني رد المستخدم، لأن فيه صنف لسه متحفظش */
  const [pendingSwitch, setPendingSwitch] = useState<{ accountId: string | null; name: string } | null>(null);

  const userName = user?.name ?? user?.email ?? 'حسابي';
  // الإيميل تحت الاسم — إلا لو هو نفسه اللي ظاهر مكان الاسم
  const userEmail = user?.name ? user.email : undefined;
  const userAvatar = (size: number) => (
    <Avatar kind="person" picture={user?.picture} fallback={personInitial(user?.name, user?.email)} size={size} />
  );
  const current = (size: number) =>
    selectedBusiness ? (
      <Avatar kind="business" picture={selectedBusiness.picture} fallback={selectedBusiness.abbreviation} size={size} />
    ) : (
      userAvatar(size)
    );

  function switchTo(accountId: string | null) {
    selectBusiness(accountId);
    const next = pathAfterSwitch(pathname, accountId);
    // replace: زرار الرجوع ميرجّعش لصفحة النشاط القديم
    if (next) navigate(next, { replace: true });
  }

  function choose(accountId: string | null, name: string) {
    close();
    if (accountId === (selectedBusiness?.accountId ?? null)) return;
    if (pathAfterSwitch(pathname, accountId) && hasUnsavedWork()) {
      setPendingSwitch({ accountId, name });
      return;
    }
    switchTo(accountId);
  }

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
        onClick={() => {
          setAccountsOpen(false);
          setOpen((v) => !v);
        }}
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
          onKeyDown={(e) => {
            // Escape والليستة مفتوحة بيقفلها هي الأول، مش المنيو كلها
            if (e.key === 'Escape' && accountsOpen) {
              e.stopPropagation();
              setAccountsOpen(false);
              accountsButton.current?.focus();
            }
          }}
          className="absolute start-0 top-full z-40 mt-1.5 max-h-[80vh] w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-card dark:border-white/10 dark:bg-surface-card"
        >
          {user ? (
            <>
              {/* ١) إنت: صورتك واسمك وتحته الإيميل */}
              <Link
                role="menuitem"
                to="/account"
                onClick={close}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-stone-50 dark:hover:bg-white/5"
              >
                {userAvatar(40)}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-base font-semibold">{userName}</span>
                    {user.demo && <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">(تجريبي)</span>}
                  </span>
                  {userEmail && (
                    <span dir="ltr" className={emailClass}>
                      {userEmail}
                    </span>
                  )}
                </span>
              </Link>

              {/* ٢) «حساباتي»: الحساب اللي شغال بيه دلوقتي، وبتفتح ليستة حساباته */}
              <div className="border-t border-stone-100 px-4 pb-3 pt-4 dark:border-white/5">
                <div className="relative">
                  <button
                    ref={accountsButton}
                    role="menuitem"
                    aria-expanded={accountsOpen}
                    aria-controls={accountsId}
                    onClick={() => setAccountsOpen((v) => !v)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition ${
                      accountsOpen ? 'border-brand-500 ring-1 ring-inset ring-brand-500' : 'border-stone-300 dark:border-white/20'
                    }`}
                  >
                    {current(30)}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {selectedBusiness ? selectedBusiness.name : userName}
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform dark:text-stone-400 ${accountsOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <Notch active={accountsOpen}>حساباتي</Notch>
                </div>

                {accountsOpen && (
                  <div
                    id={accountsId}
                    role="group"
                    aria-label="حساباتي"
                    className="mt-1.5 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 dark:divide-white/5 dark:border-white/10"
                  >
                    <AccountOption
                      checked={!selectedBusiness}
                      onSelect={() => choose(null, userName)}
                      avatar={userAvatar(32)}
                      title={userName}
                      subtitle={userEmail}
                      subtitleIsEmail
                    />
                    {businesses.map((b) => (
                      <AccountOption
                        key={b.accountId}
                        checked={selectedBusiness?.accountId === b.accountId}
                        onSelect={() => choose(b.accountId, b.name)}
                        avatar={<Avatar kind="business" picture={b.picture} fallback={b.abbreviation} size={32} />}
                        title={b.name}
                        subtitle={b.abbreviation}
                      />
                    ))}
                    {businessesLoading && businesses.length === 0 && (
                      <div className="px-3 py-2.5 text-xs text-stone-400">بنجيب أنشطتك…</div>
                    )}
                    {/* زي «إضافة حساب آخر» في ليستة حسابات جوجل */}
                    <Link role="menuitem" to="/business/new" onClick={close} className={rowClass}>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                      <span className="font-medium">أنشئ نشاط تجاري</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* ٣) تحكم في النشاط اللي بيتعامل بيه — الأصناف والمقرات */}
              {selectedBusiness && (
                <div className={sectionClass}>
                  <div className={headingClass}>تحكم في النشاط</div>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}/items`} onClick={close} className={itemClass}>
                    الأصناف
                  </Link>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}/items/new`} onClick={close} className={itemClass}>
                    إضافة صنف
                  </Link>
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}/store-items`} onClick={close} className={itemClass}>
                    إدارة أصناف المتاجر
                  </Link>
                  {/* Business Profile — الاسم اللي العميل اختاره بالعربي */}
                  <Link role="menuitem" to={`/business/${selectedBusiness.accountId}`} onClick={close} className={itemClass}>
                    بيانات الشركة
                  </Link>
                </div>
              )}

              <div className={sectionClass}>{themeItem}</div>

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

      {/* على body: الهيدر فيه backdrop-blur، وده بيحبس أي fixed جواه في مساحة الهيدر */}
      {pendingSwitch &&
        createPortal(
          <UnsavedSwitchDialog
            accountName={pendingSwitch.name}
            onCancel={() => setPendingSwitch(null)}
            onConfirm={() => {
              setPendingSwitch(null);
              switchTo(pendingSwitch.accountId);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
