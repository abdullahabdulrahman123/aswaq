import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TasksIcon } from './TasksIcon';

/**
 * شريط تحت زي تطبيقات الموبايل، بطلب العميل: ارتفاعه صغير، ودلوقتي فيه
 * أيقونة واحدة في النص — «مهامي»، المطلوب مني كمستخدم أو موظف. حاجات من
 * المنيو ممكن تتنقل هنا بعدين. للي داخل بحسابه بس، ومبيطلعش في الطباعة.
 */
export function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-[44] border-t border-stone-200 bg-surface-light/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-surface-dark/95 print:hidden"
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-center">
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white'
            }`
          }
        >
          <TasksIcon className="h-5 w-5" />
          مهامي
        </NavLink>
      </div>
    </nav>
  );
}
