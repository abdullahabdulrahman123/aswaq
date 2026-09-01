import { Link } from 'react-router-dom';
import { PastaShape } from './PastaShape';
import { useCart } from '../context/CartContext';
import { displayPrice, startingQty } from '../lib/pricing';
import {
  bestOffer,
  brandById,
  egp,
  offersForProduct,
  pricePerKg,
  variantById,
  vendorById,
  type Product,
} from '../data/catalog';

export function ProductCard({
  product,
  /** لما نكون جوه سوق شركة، نعرض عرضها هي بس مش أرخص عرض في الموقع */
  onlyVendorId,
}: {
  product: Product;
  onlyVendorId?: string;
}) {
  const { add, buyerType, vendorId: cartVendorId } = useCart();

  const all = onlyVendorId
    ? offersForProduct(product.id).filter((o) => o.vendorId === onlyVendorId)
    : offersForProduct(product.id);
  // لو السلة مقفولة على شركة، نرشّح عرضها هي — عشان الزبون ميتلغبطش
  const offer = bestOffer(all, cartVendorId ?? undefined);
  const brand = brandById(product.brandId);

  if (!offer) return null;

  const variant = variantById(offer.variantId);
  const vendor = vendorById(offer.vendorId);
  const out = offer.stock === 0;
  const shown = displayPrice(offer, buyerType);
  const vendorCount = new Set(all.map((o) => o.vendorId)).size;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition hover:border-brand-300 dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/40">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/3] bg-gradient-to-bl from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/20">
          <PastaShape shape={product.shape} className="h-full w-full p-4 transition-transform duration-300 group-hover:scale-105" />

          <div className="absolute start-3 top-3 flex flex-col items-start gap-1">
            {offer.badges?.map((b) => (
              <span key={b} className="rounded-md bg-stone-900/85 px-2 py-0.5 text-[11px] font-medium text-white">
                {b}
              </span>
            ))}
            {offer.oldPrice && (
              <span className="rounded-md bg-accent-600 px-2 py-0.5 text-[11px] font-bold text-white tnum">
                وفّر {Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)}%
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
          <span className="tnum">{variant?.weight} جم</span>
        </div>

        <h3 className="mt-1 font-display text-base font-bold leading-snug">
          <Link to={`/product/${product.id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
            {product.name}
          </Link>
        </h3>

        {/* الشركة البائعة — لينك مباشر لسوقها */}
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
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold tnum">{egp(shown)}</span>
              {buyerType === 'retail' && offer.oldPrice && (
                <span className="text-xs text-stone-400 line-through tnum">{egp(offer.oldPrice)}</span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 tnum">
              {egp(pricePerKg(shown, variant?.weight ?? 1000))} للكيلو
            </div>
          </div>

          <button
            onClick={() => add(offer.id, startingQty(offer, buyerType))}
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
