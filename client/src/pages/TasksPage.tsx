import { TasksIcon } from '../components/TasksIcon';

/**
 * «مهامي» — المطلوب من المستخدم كيوزر وكموظف، بطلب العميل. لسه مفيش مهام
 * بتتولد (بتيجي مع الطلبات والفواتير)، فالصفحة فاضية.
 */
export function TasksPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <TasksIcon className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold">مهامي</h1>
      <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">مفيش مهام مطلوبة منك دلوقتي.</p>
    </div>
  );
}
