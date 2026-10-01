import { Link } from 'react-router-dom';
import { useSales } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { itemsLabel } from '../lib/quantity';
import { CartIcon } from './CartIcon';

/**
 * «طلباتي» في الناڤبار (سهم داخل العربة): اللي أنا طالبه لنفسي أو لنشاطي.
 *
 * جوه أوردر السلة بتبقى الأوردر ده: الرقم عدد أصنافه وتحتها الإجمالي — أحمر
 * لحد ما يوصل الحد الأدنى للأوردر عند المتجر وبعدين يخضر — والدوسة بتفتح
 * الفاتورة. برّه الأوردر الدوسة بتفتح ليستة الطلبات. الرقم على الأيقونة نفسها
 * زي عدّاد رسايل الواتساب.
 *
 * كان فيه سلة بيع جنبها (٢٨ سبتمبر) واتشالت في مكالمة ٣٠ سبتمبر: الطلبات
 * الواردة بقت في «مهامي»، وفي «مبيعات» عدد الأصناف والإجمالي على اسم العميل
 * (BuyerChip).
 */
export function BuyCartButton() {
  const { focus, countOf, totalOf, orders } = useStoreCart();
  const { session } = useSales();
  const inOrder = focus && !session ? focus : null;
  const count = inOrder ? countOf(inOrder.shopId) : orders.filter((o) => !o.sale).length;

  return (
    <CartLink
      to={inOrder ? `/orders/${inOrder.shopId}` : '/orders'}
      title={inOrder ? 'الفاتورة' : 'طلباتي'}
      label={
        inOrder
          ? count > 0
            ? `الفاتورة — ${itemsLabel(count)} بـ${egp(totalOf(inOrder.shopId))}`
            : 'الفاتورة'
          : count > 0
            ? `طلباتي — ${count === 1 ? 'طلب واحد' : `${count} طلبات`}`
            : 'طلباتي'
      }
      count={count}
      total={inOrder ? totalOf(inOrder.shopId) : null}
      minimum={inOrder?.minimum ?? null}
    />
  );
}

function CartLink({
  to,
  title,
  label,
  count,
  total,
  minimum,
}: {
  to: string;
  title: string;
  label: string;
  count: number;
  /** null = برّه الأوردر، مفيش إجمالي */
  total: number | null;
  minimum: number | null;
}) {
  const reached = minimum === null || (total ?? 0) >= minimum;
  return (
    <Link
      to={to}
      aria-label={label}
      title={title}
      className="flex min-w-9 shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10"
    >
      <span className="relative">
        <CartIcon arrow="in" className="h-6 w-6" />
        {count > 0 && (
          <span
            data-badge
            className="absolute -end-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-stone-700 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-surface-light dark:bg-stone-200 dark:text-stone-900 dark:ring-surface-dark"
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
