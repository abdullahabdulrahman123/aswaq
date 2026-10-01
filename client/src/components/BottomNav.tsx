import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { TasksIcon } from './TasksIcon';

/**
 * شريط تحت زي تطبيقات الموبايل، بطلب العميل: ارتفاعه صغير، ودلوقتي فيه
 * أيقونة واحدة في النص — «مهامي»، المطلوب مني كمستخدم أو موظف. حاجات من
 * المنيو ممكن تتنقل هنا بعدين. للي داخل بحسابه بس، ومبيطلعش في الطباعة.
 *
 * مكالمة ٣٠ سبتمبر: الطلبات الواردة بقت في «مهامي»، فالعداد الأحمر بتاعها
 * (الجديد من آخر مرة اتشافت) على الأيقونة دي.
 */
export function BottomNav() {
  const { user } = useAuth();
  const { unseen } = useIncoming();
  if (!user) return null;

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-[44] border-t border-stone-200 bg-surface-light/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-surface-dark/95 print:hidden"
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-center">
        <NavLink
          to="/tasks"
          aria-label={unseen > 0 ? `مهامي — ${unseen === 1 ? 'طلب وارد جديد' : `${unseen} طلبات واردة جديدة`}` : undefined}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white'
            }`
          }
        >
          <span className="relative">
            <TasksIcon className="h-5 w-5" />
            {unseen > 0 && (
              <span
                data-badge
                className="absolute -end-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-surface-light dark:ring-surface-dark"
              >
                {unseen > 99 ? '99+' : unseen}
              </span>
            )}
          </span>
          مهامي
        </NavLink>
      </div>
    </nav>
  );
}
