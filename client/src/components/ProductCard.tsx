import { Link } from 'react-router-dom';
import { ProductArt } from './ProductArt';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { displayPrice, seesTierPricing, startingQty } from '../lib/pricing';
import {
  bestOffer,
  brandById,
  egp,
  offersForProduct,
  variantById,
  vendorById,
  type Product,
} from '../data/catalog';

export function ProductCard({
  product,
  /** لما نكون جوه سوق شركة، نعرض عرضها هي بس */
  onlyVendorId,
}: {
  product: Product;
  onlyVendorId?: string;
}) {
  const { add, vendorId: cartVendorId } = useCart();
  const { accountType } = useAuth();

  const all = onlyVendorId
    ? offersForProduct(product.id).filter((o) => o.vendorId === onlyVendorId)
    : offersForProduct(product.id);
  const offer = bestOffer(all, cartVendorId ?? undefined);
  const brand = brandById(product.brandId);

  if (!offer) return null;

  const variant = variantById(offer.variantId);
  const vendor = vendorById(offer.vendorId);
  const out = offer.stock === 0;
  const shown = displayPrice(offer, accountType);
  const vendorCount = new Set(all.map((o) => o.vendorId)).size;
  const firstTier = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition hover:border-brand-300 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/40">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/3] bg-gradient-to-bl from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/20">
          <ProductArt category={product.category} className="h-full w-full p-4 transition-transform duration-300 group-hover:scale-105" />

          {out && (
            <div className="absolute inset-0 grid place-items-center bg-stone-900/55">
              <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-stone-900">غير متوفر حالياً</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
          <span>{brand?.name}</span>
          <span className="truncate">{variant?.label}</span>
        </div>

        <h3 className="mt-1 font-display text-base font-bold leading-snug">
          <Link to={`/product/${product.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
            {product.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <span className="tnum text-brand-600 dark:text-brand-400">★ {offer.rating}</span>
          <span className="tnum text-stone-400">({offer.reviews})</span>
          <span className="text-stone-300" aria-hidden="true">·</span>
          <Link
            to={`/vendor/${offer.vendorId}`}
            className="font-medium text-stone-600 underline-offset-2 hover:text-brand-600 hover:underline dark:text-stone-300 dark:hover:text-brand-400"
          >
            {vendor?.name}
          </Link>
          {vendor?.verified && <span className="text-accent-600 dark:text-accent-400" title="شركة موثّقة">✓</span>}
        </div>

        {!onlyVendorId && vendorCount > 1 && (
          <Link to={`/product/${product.id}`} className="mt-1 text-[11px] text-accent-600 hover:underline dark:text-accent-400">
            متوفر من {vendorCount} شركات — قارن الأسعار
          </Link>
        )}

        <div className="mt-3 flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="font-display text-lg font-bold tnum">{egp(shown)}</span>
            {seesTierPricing(accountType) && firstTier && (
              <div className="text-[11px] text-stone-400 tnum">من {firstTier.minQty} قطعة</div>
            )}
          </div>

          <button
            onClick={() => add(offer.id, startingQty(offer, accountType))}
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
