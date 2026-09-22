import { Link } from 'react-router-dom';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { itemsLabel } from '../lib/quantity';
import { CartIcon } from './CartIcon';

/**
 * السلة في الناڤبار: تحت الأيقونة عدد الأصناف وتحته الإجمالي، بطلب العميل —
 * «إحنا برنامج لوجستيك، الناس بتتحرك في إطار بادجيت»، فالإجمالي بيبان مش
 * مستخبي.
 *
 * جوه صفحة متجر بيعرض سلة المتجر ده وحده: أحمر لحد ما يوصل الحد الأدنى
 * للأوردر عنده، وبعدين يخضر. برّه المتجر بيعرض إجمالي السلة كلها بلون عادي.
 *
 * الصفحة نفسها لسه «قريباً» — الطلبات بعد كلام قاعدة البيانات مع العميل.
 */
export function CartButton() {
  const { focus, countOf, totalOf, count, total } = useStoreCart();

  const shownCount = focus ? countOf(focus.shopId) : count;
  const shownTotal = focus ? totalOf(focus.shopId) : total;
  const minimum = focus?.minimum ?? null;
  const reached = minimum === null || shownTotal >= minimum;

  return (
    <Link
      to="/orders"
      aria-label={shownCount > 0 ? `طلباتي — ${itemsLabel(shownCount)} بـ${egp(shownTotal)}` : 'طلباتي'}
      title="طلباتي"
      className="flex min-w-9 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10"
    >
      <CartIcon className="h-6 w-6" />
      {shownCount > 0 && (
        <>
          <span className="text-[10px] leading-none text-stone-500 dark:text-stone-400">{itemsLabel(shownCount)}</span>
          <span
            className={`text-[11px] font-bold leading-none tabular-nums ${
              minimum === null
                ? 'text-stone-700 dark:text-stone-200'
                : reached
                  ? 'text-accent-600 dark:text-accent-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {egp(shownTotal)}
          </span>
        </>
      )}
    </Link>
  );
}
