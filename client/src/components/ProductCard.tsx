import { Link } from 'react-router-dom';
import { PastaShape } from './PastaShape';
import { useCart } from '../context/CartContext';
import { brandById, vendorById, egp, type Product } from '../data/catalog';

export function ProductCard({ product }: { product: Product }) {
  const { add, buyerType } = useCart();
  const brand = brandById(product.brandId);
  const vendor = vendorById(product.vendorId);
  const out = product.stock === 0;

  // في وضع الجملة نعرض سعر أول شريحة لأنه السعر اللي التاجر هيدفعه فعلاً
  const firstTier = [...product.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  const shown = buyerType === 'wholesale' && firstTier ? firstTier.price : product.price;
  const perKg = (shown / product.weight) * 1000;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition hover:border-brand-300 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/40">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/3] bg-gradient-to-bl from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/20">
          <PastaShape shape={product.shape} className="h-full w-full p-4 transition-transform duration-300 group-hover:scale-105" />

          <div className="absolute start-3 top-3 flex flex-col items-start gap-1">
            {product.badges?.map((b) => (
              <span key={b} className="rounded-md bg-stone-900/85 px-2 py-0.5 text-[11px] font-medium text-white">
                {b}
              </span>
            ))}
            {product.oldPrice && (
              <span className="rounded-md bg-accent-600 px-2 py-0.5 text-[11px] font-bold text-white tnum">
                وفّر {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
              </span>
            )}
          </div>

          {out && (
            <div className="absolute inset-0 grid place-items-center bg-stone-900/55">
              <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-stone-900">غير متوفر حالياً</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{brand?.name}</span>
          <span className="tnum">{product.weight} جم</span>
        </div>

        <h3 className="mt-1 font-display text-base font-bold leading-snug">
          <Link to={`/product/${product.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
            {product.name}
          </Link>
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <span className="tnum text-brand-600 dark:text-brand-400">★ {product.rating}</span>
          <span className="tnum">({product.reviews})</span>
          <span aria-hidden="true">·</span>
          <span className={vendor?.kind === 'own' ? 'text-accent-600 dark:text-accent-400' : ''}>
            {vendor?.kind === 'own' ? 'شحن أسواق' : vendor?.name}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold tnum">{egp(shown)}</span>
              {buyerType === 'retail' && product.oldPrice && (
                <span className="text-xs text-stone-400 line-through tnum">{egp(product.oldPrice)}</span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 tnum">
              {buyerType === 'wholesale' && firstTier
                ? `من ${firstTier.minQty} قطعة · ${egp(Math.round(perKg))}/كجم`
                : `${egp(Math.round(perKg))} للكيلو`}
            </div>
          </div>

          <button
            onClick={() => add(product.id, buyerType === 'wholesale' && firstTier ? firstTier.minQty : 1)}
            disabled={out}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-white/10 dark:disabled:text-stone-500"
          >
            {out ? 'نفد' : 'أضف'}
          </button>
        </div>
      </div>
    </article>
  );
}
