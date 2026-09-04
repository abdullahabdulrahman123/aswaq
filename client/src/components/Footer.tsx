import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'تسوق',
    links: [
      { to: '/products', label: 'كل المنتجات' },
      { to: '/products?sort=best', label: 'الأكثر مبيعاً' },
      { to: '/products?sort=price-asc', label: 'الأوفر سعراً' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-stone-50 dark:border-white/10 dark:bg-surface-DEFAULT">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2">
        <div>
          <div className="font-display text-2xl font-bold text-brand-700 dark:text-brand-400">أسواق</div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            منصة بيع تجمع شركات موثّقة في مكان واحد — كل شركة بتعرض منتجاتها وأسعارها.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-sm font-bold">{col.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-500 dark:text-stone-400">
              {col.links.map((l, i) => (
                <li key={i}>
                  <Link to={l.to} className="hover:text-brand-600 dark:hover:text-brand-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-stone-200 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-400">
          <span>نموذج أولي للعرض — البيانات تجريبية ولا توجد طلبات حقيقية.</span>
          <span className="tnum">أسواق © 2026</span>
        </div>
      </div>
    </footer>
  );
}
