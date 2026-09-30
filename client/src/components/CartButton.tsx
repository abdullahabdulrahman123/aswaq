import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { useSales } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { itemsLabel } from '../lib/quantity';
import { CartIcon } from './CartIcon';

/**
 * السلتين في الناڤبار، بطلب العميل (مكالمة ٢٨ سبتمبر) — الشرا والبيع كانوا في
 * سلة واحدة ومتلخبطين:
 *   - «طلباتي» (سهم داخل): اللي أنا طالبه لنفسي أو لنشاطي
 *   - «الطلبات الواردة» (سهم طالع، بلون تاني): المطلوب من نشاطي، وفيها فواتير «مبيعات»
 *
 * جوه أوردر السلة بتاعته هي اللي بتبقى الأوردر ده: الرقم عدد أصنافه وتحتها
 * الإجمالي — أحمر لحد ما يوصل الحد الأدنى للأوردر عند المتجر وبعدين يخضر —
 * والدوسة بتفتح الفاتورة. برّه الأوردر الدوسة بتفتح ليستة السلة.
 *
 * الرقم على الأيقونة نفسها زي عدّاد رسايل الواتساب. الأحمر للطلبات الواردة
 * الجديدة بس (من آخر مرة الصفحة اتفتحت)، وأي عدّ تاني لونه هادي.
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
      arrow="in"
      count={count}
      total={inOrder ? totalOf(inOrder.shopId) : null}
      minimum={inOrder?.minimum ?? null}
    />
  );
}

/** بتظهر للي بيبيع بس: نشاط مختار، أو جوه بيعة */
export function SellCartButton() {
  const { focus, countOf, totalOf } = useStoreCart();
  const { session } = useSales();
  const { selectedBusiness } = useAuth();
  const { unseen } = useIncoming();
  const accountId = session?.accountId ?? selectedBusiness?.accountId ?? null;
  if (!accountId) return null;
  const inOrder = focus && session ? focus : null;
  const count = inOrder ? countOf(inOrder.shopId) : unseen;

  return (
    <CartLink
      to={inOrder ? `/orders/${inOrder.shopId}` : `/business/${accountId}/incoming`}
      title={inOrder ? 'الفاتورة' : 'الطلبات الواردة'}
      label={
        inOrder
          ? count > 0
            ? `الفاتورة — ${itemsLabel(count)} بـ${egp(totalOf(inOrder.shopId))}`
            : 'الفاتورة'
          : count > 0
            ? `الطلبات الواردة — ${count === 1 ? 'طلب جديد' : `${count} طلبات جديدة`}`
            : 'الطلبات الواردة'
      }
      arrow="out"
      count={count}
      alert={!inOrder}
      total={inOrder ? totalOf(inOrder.shopId) : null}
      minimum={inOrder?.minimum ?? null}
      sell
    />
  );
}

function CartLink({
  to,
  title,
  label,
  arrow,
  count,
  total,
  minimum,
  alert = false,
  sell = false,
}: {
  to: string;
  title: string;
  label: string;
  arrow: 'in' | 'out';
  count: number;
  /** null = برّه الأوردر، مفيش إجمالي */
  total: number | null;
  minimum: number | null;
  /** العدّ ده طلبات واردة جديدة — أحمر */
  alert?: boolean;
  sell?: boolean;
}) {
  const reached = minimum === null || (total ?? 0) >= minimum;
  return (
    <Link
      to={to}
      aria-label={label}
      title={title}
      className={`flex min-w-9 shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition ${
        sell
          ? 'text-accent-700 hover:bg-accent-500/10 dark:text-accent-300'
          : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10'
      }`}
    >
      <span className="relative">
        <CartIcon arrow={arrow} className="h-6 w-6" />
        {count > 0 && (
          <span
            data-badge
            className={`absolute -end-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums ring-2 ring-surface-light dark:ring-surface-dark ${
              alert ? 'bg-red-600 text-white' : 'bg-stone-700 text-white dark:bg-stone-200 dark:text-stone-900'
            }`}
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
