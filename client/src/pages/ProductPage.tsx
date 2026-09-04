import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductArt } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { unitPrice, nextTier, seesTierPricing } from '../lib/pricing';
import {
  bestOffer,
  brandById,
  categoryById,
  egp,
  offersForVariant,
  productById,
  products,
  variantsOf,
  vendorById,
  vendorInitials,
} from '../data/catalog';

export function ProductPage() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;
  const { add, vendorId: cartVendorId } = useCart();
  const { accountType } = useAuth();

  const sizes = product ? variantsOf(product.id) : [];
  const [variantId, setVariantId] = useState(sizes[0]?.id ?? '');
  const [offerId, setOfferId] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setVariantId(variantsOf(product?.id ?? '')[0]?.id ?? '');
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!variantId) return;
    setOfferId(bestOffer(offersForVariant(variantId), cartVendorId ?? undefined)?.id ?? '');
  }, [variantId, cartVendorId]);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">المنتج غير موجود</h1>
        <Link to="/products" className="mt-4 inline-block text-brand-600 hover:underline dark:text-brand-400">
          ارجع للمنتجات
        </Link>
      </div>
    );
  }

  const brand = brandById(product.brandId);
  const category = categoryById(product.category);
  const variant = sizes.find((v) => v.id === variantId) ?? sizes[0];
  const variantOffers = [...offersForVariant(variant?.id ?? '')].sort((a, b) => a.price - b.price);
  const offer = variantOffers.find((o) => o.id === offerId) ?? variantOffers[0];

  if (!offer || !variant) return null;

  const vendor = vendorById(offer.vendorId);
  const out = offer.stock === 0;
  const price = unitPrice(offer, qty, accountType);
  const upcoming = seesTierPricing(accountType) ? nextTier(offer, qty) : undefined;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  function handleAdd() {
    if (add(offer.id, qty)) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Link to="/" className="hover:text-brand-600">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products" className="hover:text-brand-600">المنتجات</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/products?category=${product.category}`} className="hover:text-brand-600">{category?.name}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-bl from-brand-50 to-brand-100 dark:border-white/10 dark:from-brand-900/40 dark:to-brand-800/20">
            <ProductArt category={product.category} className="aspect-square w-full p-10" />
          </div>
          <p className="mt-3 text-xs text-stone-400">رسم توضيحي — الصور الحقيقية هترفعها الشركة من لوحتها.</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <span>{brand?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{category?.name}</span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-300">{product.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="tnum text-brand-600 dark:text-brand-400">★ {offer.rating}</span>
            <span className="tnum text-stone-400">({offer.reviews} تقييم)</span>
            {out ? (
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">غير متوفر</span>
            ) : (
              <span className="rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 tnum dark:bg-accent-500/15 dark:text-accent-300">
                متوفر {offer.stock} قطعة
              </span>
            )}
          </div>

          {sizes.length > 1 && (
            <div className="mt-6">
              <h2 className="mb-2 font-display text-sm font-bold">العبوة</h2>
              <div className="flex flex-wrap gap-2">
                {sizes.map((v) => {
                  const cheapest = bestOffer(offersForVariant(v.id));
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setVariantId(v.id); setQty(1); }}
                      aria-pressed={v.id === variant.id}
                      className={`rounded-xl border px-4 py-2.5 text-sm transition ${
                        v.id === variant.id
                          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800 dark:bg-brand-500/15 dark:text-brand-300'
                          : 'border-stone-300 hover:border-brand-400 dark:border-white/15'
                      }`}
                    >
                      {v.label}
                      {cheapest && <span className="ms-2 text-xs text-stone-400 tnum">من {egp(cheapest.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* السعر */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <div className="font-display text-3xl font-bold tnum">{egp(price)}</div>

            {upcoming && (
              <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700 tnum dark:bg-accent-500/10 dark:text-accent-300">
                زوّد لـ{upcoming.minQty} قطعة والسعر ينزل لـ{egp(upcoming.price)} للقطعة.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-stone-300 dark:border-white/15">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="تقليل الكمية" className="px-4 py-2.5 text-lg leading-none hover:text-brand-600">−</button>
                <input
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  inputMode="numeric"
                  aria-label="الكمية"
                  className="w-14 border-x border-stone-300 bg-transparent py-2.5 text-center tnum dark:border-white/15"
                />
                <button onClick={() => setQty((q) => q + 1)} aria-label="زيادة الكمية" className="px-4 py-2.5 text-lg leading-none hover:text-brand-600">+</button>
              </div>

              <button
                onClick={handleAdd}
                disabled={out}
                className="flex-1 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-white/10 dark:disabled:text-stone-500"
              >
                {out ? 'غير متوفر' : added ? 'تمت الإضافة ✓' : `أضف للسلة — ${egp(price * qty)}`}
              </button>
            </div>
          </div>

          {/* مقارنة الشركات */}
          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <h2 className="font-display text-sm font-bold">
              {variantOffers.length > 1 ? `متوفر من ${variantOffers.length} شركات` : 'الشركة البائعة'}
            </h2>

            <ul className="mt-3 space-y-2">
              {variantOffers.map((o) => {
                const v = vendorById(o.vendorId);
                const selected = o.id === offer.id;
                return (
                  <li key={o.id}>
                    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${
                      selected ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-stone-200 dark:border-white/10'
                    }`}>
                      <button
                        onClick={() => { setOfferId(o.id); setQty(1); }}
                        disabled={o.stock === 0}
                        className="flex min-w-0 flex-1 items-center gap-3 text-start disabled:opacity-50"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 font-display text-xs font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
                          {vendorInitials(v?.name ?? '')}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-sm font-semibold">
                            {v?.name}
                            {v?.verified && <span className="text-accent-600 dark:text-accent-400" title="موثّقة">✓</span>}
                          </span>
                          <span className="block text-xs text-stone-400 tnum">
                            ★ {o.rating} · {v?.city}{o.stock === 0 && ' · نفدت الكمية'}
                          </span>
                        </span>
                      </button>

                      <div className="text-end">
                        <div className="font-display font-bold tnum">{egp(o.price)}</div>
                        {selected && <div className="text-[11px] text-brand-600 dark:text-brand-400">مختارة</div>}
                      </div>

                      <Link
                        to={`/vendor/${o.vendorId}`}
                        className="whitespace-nowrap rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
                      >
                        سوق الشركة ←
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {cartVendorId && cartVendorId !== offer.vendorId && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                سلتك دلوقتي من <strong>{vendorById(cartVendorId)?.name}</strong>. الطلب الواحد من شركة واحدة —
                لو ضفت من {vendor?.name} هنسألك الأول.
              </p>
            )}
          </div>

          {/* أسعار الكميات — للشركات فقط */}
          {seesTierPricing(accountType) && offer.tiers.length > 0 && (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
              <h2 className="font-display text-sm font-bold">أسعار الكميات — {vendor?.name}</h2>
              <table className="mt-3 w-full text-sm tnum">
                <thead>
                  <tr className="text-xs text-stone-400">
                    <th className="pb-2 text-start font-medium">الكمية</th>
                    <th className="pb-2 text-start font-medium">سعر القطعة</th>
                    <th className="pb-2 text-end font-medium">التوفير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-white/10">
                  {offer.tiers.map((t) => (
                    <tr key={t.minQty} className={qty >= t.minQty ? 'text-accent-700 dark:text-accent-300' : ''}>
                      <td className="py-2">من {t.minQty}</td>
                      <td className="py-2 font-semibold">{egp(t.price)}</td>
                      <td className="py-2 text-end">{Math.round(((offer.price - t.price) / offer.price) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-xl font-bold">منتجات من نفس التصنيف</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
