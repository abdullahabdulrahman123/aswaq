/**
 * أيقونة العربة — في الناڤبار وفي صفحة طلباتي.
 *
 * السلتين (مكالمة ٢٨ سبتمبر، الشكل اللي العميل اختاره): سهمين زي InstaPay.
 *   in:  سهم داخل العربة — «طلباتي»، اللي أنا بشتريه. نازل جوه العربة شوية عشان يبان
 *   out: سهم طالع منها — «الطلبات الواردة»، اللي أنا ببيعه
 * العربة نفسها زي ما هي.
 */
export function CartIcon({ className, arrow }: { className?: string; arrow?: 'in' | 'out' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h2.2l2.3 10.4a1.2 1.2 0 0 0 1.2.9h8.6a1.2 1.2 0 0 0 1.2-.9L20.2 7.5H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
      {arrow === 'in' && <path d="M13 1v11m-2.7-2.7L13 12l2.7-2.7" />}
      {arrow === 'out' && <path d="M13 12.5V1.5m-2.7 2.7L13 1.5l2.7 2.7" />}
    </svg>
  );
}
