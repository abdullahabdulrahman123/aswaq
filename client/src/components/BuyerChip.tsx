import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales } from '../context/SalesContext';
import { useStoreCart } from '../context/StoreCartContext';
import { egp } from '../data/catalog';
import { itemsLabel } from '../lib/quantity';
import { Avatar, personInitial } from './Avatar';

/**
 * المشتري في «مبيعات»: اسمه على شمال «طلباتي» وإنت جوه الأوردر، بطلب العميل —
 * من غير كلمة «المشتري» ولا ✕ (الخروج من الأوردر هو اللي بيقفله). المشتري
 * المسجّل بيظهر بصورته.
 *
 * مكالمة ٣٠ سبتمبر: سلة البيع اتشالت ومكانها هنا — تحت الاسم الإجمالي (أحمر لحد
 * الحد الأدنى للأوردر وبعدين أخضر، زي السلة)، وعدد الأصناف على المستطيل، والدوسة
 * بتفتح الفاتورة. تعديل بيانات العميل من زرار في الفاتورة.
 */
export function BuyerChip() {
  const { session, openDialog, confirmedOrderId } = useSales();
  const { businesses } = useAuth();
  const { focus, countOf, totalOf } = useStoreCart();
  if (!session) return null;
  const business = businesses.find((b) => b.accountId === session.accountId);
  const { buyer } = session;
  const name = buyerLabel(session);
  const count = focus ? countOf(focus.shopId) : 0;
  const total = focus ? totalOf(focus.shopId) : 0;
  const reached = focus?.minimum == null || total >= focus.minimum;

  const body = (
    <>
      {!session.walkIn && (
        <Avatar
          picture={buyer.picture}
          fallback={buyer.kind === 'business' ? (buyer.abbreviation ?? buyer.name) : personInitial(buyer.name, undefined)}
          kind={buyer.kind === 'business' ? 'business' : 'person'}
          size={22}
          tone="soft"
        />
      )}
      <span className="min-w-0">
        <span className="block max-w-[8.5rem] truncate text-xs font-semibold leading-tight">{name}</span>
        {count > 0 && (
          <span
            data-total
            className={`block text-[11px] font-bold leading-tight tabular-nums ${
              focus?.minimum == null ? 'text-stone-700 dark:text-stone-200' : reached ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {egp(total)}
          </span>
        )}
      </span>
      {count > 0 && (
        <span
          data-badge
          className="absolute -end-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-stone-700 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-surface-light dark:bg-stone-200 dark:text-stone-900 dark:ring-surface-dark"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  );
  const chipClass =
    'relative flex min-w-0 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2 py-1 text-start transition hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/20';

  // برّه صفحة المتجر وفاتورته مفيش أوردر نفتحه — الدوسة بتعدّل البيانات زي الأول
  if (!focus) {
    return (
      <button type="button" onClick={() => business && openDialog(business, session)} aria-label={`المشتري: ${name} — تعديل`} className={chipClass}>
        {body}
      </button>
    );
  }
  // الفاتورة اتأكدت من صفحة المتجر (٢ أكتوبر) — السلة فاضية، فالدوسة بتفتح المؤكدة
  return (
    <Link
      to={confirmedOrderId ? `/invoice/${confirmedOrderId}` : `/orders/${focus.shopId}`}
      title="الفاتورة"
      aria-label={`المشتري: ${name} — الفاتورة${count > 0 ? `، ${itemsLabel(count)} بـ${egp(total)}` : ''}`}
      className={chipClass}
    >
      {body}
    </Link>
  );
}
