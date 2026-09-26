import { Link } from 'react-router-dom';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { itemsLabel } from '../lib/quantity';
import { CartIcon } from './CartIcon';

/**
 * السلة في الناڤبار. الرقم على الأيقونة نفسها زي عدّاد رسايل الواتساب، بطلب
 * العميل، وتحتها الإجمالي — «إحنا برنامج لوجستيك، الناس بتتحرك في إطار بادجيت».
 *
 * جوه صفحة متجر هي الأوردر ده: الرقم عدد أصنافه، والإجمالي أحمر لحد ما يوصل
 * الحد الأدنى للأوردر عند المتجر وبعدين يخضر، والدوسة بتفتح الفاتورة.
 * برّه المتجر الرقم عدد الأوردرات المفتوحة، والدوسة بتفتح ليستتها.
 */
export function CartButton() {
  const { focus, countOf, totalOf, orders } = useStoreCart();

  const count = focus ? countOf(focus.shopId) : orders.length;
  const total = focus ? totalOf(focus.shopId) : null;
  const minimum = focus?.minimum ?? null;
  const reached = minimum === null || (total ?? 0) >= minimum;

  const label = focus
    ? count > 0
      ? `الفاتورة — ${itemsLabel(count)} بـ${egp(total ?? 0)}`
      : 'الفاتورة'
    : count > 0
      ? `الطلبات — ${count === 1 ? 'طلب واحد' : `${count} طلبات`}`
      : 'الطلبات';

  return (
    <Link
      to={focus ? `/orders/${focus.shopId}` : '/orders'}
      aria-label={label}
      title={focus ? 'الفاتورة' : 'الطلبات'}
      className="flex min-w-9 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10"
    >
      <span className="relative">
        <CartIcon className="h-6 w-6" />
        {count > 0 && (
          <span
            data-badge
            className="absolute -end-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-surface-light dark:ring-surface-dark"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      {total !== null && count > 0 && (
        <span
          className={`text-[11px] font-bold leading-none tabular-nums ${
            minimum === null
              ? 'text-stone-700 dark:text-stone-200'
              : reached
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {egp(total)}
        </span>
      )}
    </Link>
  );
}
