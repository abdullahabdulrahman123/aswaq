import { CartIcon } from '../components/CartIcon';

/**
 * طلباتي — لسه «قريباً» بطلب العميل. العربة اللي في الناڤبار بتودّي هنا.
 * صفحة العربة القديمة (CartPage على /cart) لسه موجودة، بس مفيش لينك ليها.
 */
export function OrdersPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <CartIcon className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold">طلباتي</h1>
      <p className="mt-2 font-display text-lg font-semibold text-brand-700 dark:text-brand-400">قريباً</p>
      <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
        هنا هتلاقي طلباتك وتتابع توصيلها.
      </p>
    </div>
  );
}
