import { CartIcon } from '../components/CartIcon';
import { OrderRowButton } from '../components/OrderRowButton';
import { useOrderRows } from '../lib/orderRows';

/**
 * «طلباتي» — سلة الشرا برّه المتجر بتودّي هنا، بطلب العميل: كل أوردر أنا طالبه
 * باسم الشركة والمتجر، والدوسة بترجّعك جوّاه أو بتفتح فاتورته.
 *
 * بيعات «مبيعات» مش هنا — مكانها سلة البيع («الطلبات الواردة»)، عشان فواتير
 * البيع متتلخبطش مع اللي أنا طالبه (مكالمة ٢٨ سبتمبر). من غير فلاتر لحد ما
 * الحالات تتحدد، بطلب العميل.
 */
export function OrdersPage() {
  const { rows: all, open, loading } = useOrderRows();
  const rows = all.filter((row) => !row.sale);

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <CartIcon arrow="in" className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">طلباتي</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          {loading ? 'بنجيب طلباتك…' : 'مفيش طلبات. ادخل على أي متجر وضيف أصناف.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">طلباتي</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">دوس على أي طلب ترجع تكمّله أو تشوف فاتورته.</p>

      {/* grid-cols-1 = عمود minmax(0,1fr): من غيره العمود بيوسع على قد الاسم الطويل والـtruncate ميشتغلش، والصفحة بتعمل سكرول يمين وشمال على الموبايل (مكالمة ٢٨ سبتمبر) */}
      <ul aria-label="الطلبات المفتوحة" className="mt-5 grid grid-cols-1 gap-2.5">
        {rows.map((row) => (
          <OrderRowButton key={row.key} row={row} title={row.business || row.store} onOpen={() => open(row)} />
        ))}
      </ul>
    </div>
  );
}
