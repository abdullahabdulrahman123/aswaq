import { Link } from 'react-router-dom';
import { productsOfVendor, vendorInitials, type Vendor } from '../data/catalog';

/** أول حرفين من اسم الشركة كشعار مؤقت لحد ما ترفع لوجوهات حقيقية */
function VendorMark({ name }: { name: string }) {
  const initials = vendorInitials(name);
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-bl from-brand-100 to-brand-200 font-display text-lg font-bold text-brand-800 dark:from-brand-500/25 dark:to-brand-700/25 dark:text-brand-200">
      {initials}
    </div>
  );
}

export function VendorCard({ vendor, rank }: { vendor: Vendor; rank?: number }) {
  const productCount = productsOfVendor(vendor.id).length;

  return (
    <article className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition hover:border-brand-300 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/40">
      {rank !== undefined && (
        <span className="absolute start-4 top-0 -translate-y-1/2 rounded-md bg-brand-500 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
          #{rank}
        </span>
      )}

      <div className="flex items-start gap-3">
        <VendorMark name={vendor.name} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-display text-base font-bold leading-snug">
            <Link to={`/vendor/${vendor.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
              {vendor.name}
            </Link>
            {vendor.verified && (
              <span title="شركة موثّقة" className="text-accent-600 dark:text-accent-400">
                ✓
              </span>
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-stone-400">{vendor.city} · من {vendor.since}</p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {vendor.tagline}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-200 pt-3 text-center dark:border-white/10">
        <div>
          <dt className="text-[11px] text-stone-400">التقييم</dt>
          <dd className="font-display text-sm font-bold text-brand-600 tnum dark:text-brand-400">★ {vendor.rating}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-stone-400">طلب مكتمل</dt>
          <dd className="font-display text-sm font-bold tnum">{vendor.sales.toLocaleString('en-EG')}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-stone-400">صنف</dt>
          <dd className="font-display text-sm font-bold tnum">{productCount}</dd>
        </div>
      </dl>

      <Link
        to={`/vendor/${vendor.id}`}
        className="mt-4 rounded-xl bg-stone-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-brand-500 dark:hover:bg-brand-600"
      >
        ادخل سوق الشركة ←
      </Link>
    </article>
  );
}
