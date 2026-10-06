import { IncomingOrders } from '../components/IncomingOrders';
import { TasksIcon } from '../components/TasksIcon';
import { useAuth } from '../context/AuthContext';

/**
 * «مهامي» — المطلوب من المستخدم كيوزر وكموظف، بطلب العميل.
 *
 * مكالمة ٣٠ سبتمبر: «الطلبات الواردة» مكانها هنا (كانت سلة بيع فوق)، للنشاط
 * المختار. الحساب الشخصي لسه مفيش مهام بتتولدله.
 */
export function TasksPage() {
  const { selectedBusiness } = useAuth();

  if (!selectedBusiness) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <TasksIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">مهامي</h1>
        <p className="mt-3 leading-relaxed text-gray-500 dark:text-gray-400">مفيش مهام مطلوبة منك دلوقتي.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">مهامي</h1>
      {/* key: نشاط تاني = ليستة من الأول (زرار «طلبات جديدة ↑» ميفضلش من النشاط القديم) */}
      <IncomingOrders key={selectedBusiness.accountId} business={selectedBusiness} />
    </div>
  );
}
