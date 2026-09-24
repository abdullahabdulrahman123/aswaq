import { useAuth } from '../context/AuthContext';
import { useSales } from '../context/SalesContext';

/**
 * المشتري في «مبيعات»: اسمه على شمال السلة، بطلب العميل. الدوسة على الاسم
 * بتفتح نافذة «مبيعات» تاني لتعديل البيانات، و✕ بتقفل البيعة وترجّع سلة
 * المستخدم لنفسه.
 */
export function BuyerChip() {
  const { session, end, openDialog } = useSales();
  const { businesses } = useAuth();
  if (!session) return null;
  const business = businesses.find((b) => b.accountId === session.accountId);

  return (
    <div className="flex min-w-0 items-center rounded-lg border border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10">
      <button
        type="button"
        onClick={() => business && openDialog(business)}
        aria-label={`المشتري: ${session.buyerName} — تعديل`}
        className="min-w-0 px-2 py-1 text-start"
      >
        <span className="block text-[10px] leading-none text-brand-700 dark:text-brand-300">المشتري</span>
        <span className="mt-0.5 block max-w-[8.5rem] truncate text-xs font-semibold leading-tight">{session.buyerName}</span>
      </button>
      <button
        type="button"
        onClick={end}
        aria-label="إنهاء البيع"
        title="إنهاء البيع"
        className="self-stretch rounded-e-lg px-1.5 text-stone-500 transition hover:bg-brand-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
