import { useAuth } from '../context/AuthContext';
import { buyerLabel, useSales } from '../context/SalesContext';
import { Avatar, personInitial } from './Avatar';

/**
 * المشتري في «مبيعات»: اسمه على شمال السلة وإنت جوه الأوردر، بطلب العميل —
 * من غير كلمة «المشتري» ولا ✕ (الخروج من الأوردر هو اللي بيقفله). المشتري
 * المسجّل بيظهر بصورته. الدوسة بتفتح نافذة «مبيعات» لتعديل البيانات.
 */
export function BuyerChip() {
  const { session, openDialog } = useSales();
  const { businesses } = useAuth();
  if (!session) return null;
  const business = businesses.find((b) => b.accountId === session.accountId);
  const { buyer } = session;

  return (
    <button
      type="button"
      onClick={() => business && openDialog(business, session)}
      aria-label={`المشتري: ${buyerLabel(session)} — تعديل`}
      className="flex min-w-0 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2 py-1 text-start transition hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/20"
    >
      {!session.walkIn && (
        <Avatar
          picture={buyer.picture}
          fallback={buyer.kind === 'business' ? (buyer.abbreviation ?? buyer.name) : personInitial(buyer.name, undefined)}
          kind={buyer.kind === 'business' ? 'business' : 'person'}
          size={22}
          tone="soft"
        />
      )}
      <span className="block max-w-[8.5rem] truncate text-xs font-semibold leading-tight">{buyerLabel(session)}</span>
    </button>
  );
}
