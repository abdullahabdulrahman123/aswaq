/**
 * أيقونة العربة — في الناڤبار وفي صفحة طلباتي.
 *
 * in: سهم داخل العربة زي InstaPay — «طلباتي»، اللي أنا بشتريه (الشكل اللي
 * العميل اختاره ٢٨ سبتمبر). نازل جوه العربة شوية عشان يبان. سهم «الطلبات
 * الواردة» الطالع اتشال مع سلتها (٣٠ سبتمبر).
 */
export function CartIcon({ className, arrow }: { className?: string; arrow?: 'in' }) {
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
    </svg>
  );
}
