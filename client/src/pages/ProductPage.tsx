import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PastaShape } from '../components/PastaShape';
import { ProductCard } from '../components/ProductCard';
import { useCart, unitPrice, nextTier } from '../context/CartContext';
import { productById, brandById, vendorById, shapeById, products, egp } from '../data/catalog';

export function ProductPage() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;
  const { add, buyerType, setBuyerType } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

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
  const vendor = vendorById(product.vendorId);
  const shape = shapeById(product.shape);
  const out = product.stock === 0;

  const price = unitPrice(product, qty, buyerType);
  const upcoming = buyerType === 'wholesale' ? nextTier(product, qty) : undefined;
  const related = products.filter((p) => p.shape === product.shape && p.id !== product.id).slice(0, 3);

  function handleAdd() {
    add(product!.id, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Link to="/" className="hover:text-brand-600">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products" className="hover:text-brand-600">المنتجات</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/products?shape=${product.shape}`} className="hover:text-brand-600">{shape?.name}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-bl from-brand-50 to-brand-100 dark:border-white/10 dark:from-brand-900/40 dark:to-brand-800/20">
            <PastaShape shape={product.shape} className="aspect-square w-full p-10" />
          </div>
          <p className="mt-3 text-xs text-stone-400">
            رسم توضيحي — الصور الحقيقية هيرفعها البائع من لوحته.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <span>{brand?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{shape?.name}</span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-bold">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="tnum text-brand-600 dark:text-brand-400">★ {product.rating}</span>
            <span className="tnum text-stone-400">({product.reviews} تقييم)</span>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs tnum dark:bg-white/10">{product.weight} جم</span>
            {out ? (
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                غير متوفر
              </span>
            ) : (
              <span className="rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 tnum dark:bg-accent-500/15 dark:text-accent-300">
                متوفر {product.stock} قطعة
              </span>
            )}
          </div>

          {/* السعر */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl font-bold tnum">{egp(price)}</span>
                  {buyerType === 'retail' && product.oldPrice && (
                    <span className="text-base text-stone-400 line-through tnum">{egp(product.oldPrice)}</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-stone-400 tnum">
                  {egp(Math.round((price / product.weight) * 1000))} للكيلو
                </div>
              </div>
              <button
                onClick={() => setBuyerType(buyerType === 'retail' ? 'wholesale' : 'retail')}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium dark:border-white/15"
              >
                {buyerType === 'retail' ? 'اعرض أسعار الجملة' : 'ارجع لأسعار التجزئة'}
              </button>
            </div>

            {upcoming && (
              <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700 tnum dark:bg-accent-500/10 dark:text-accent-300">
                زوّد لـ{upcoming.minQty} قطعة والسعر ينزل لـ{egp(upcoming.price)} للقطعة.
              </p>
            )}

            {/* الكمية والإضافة */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-stone-300 dark:border-white/15">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="تقليل الكمية"
                  className="px-4 py-2.5 text-lg leading-none hover:text-brand-600"
                >
                  −
                </button>
                <input
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  inputMode="numeric"
                  aria-label="الكمية"
                  className="w-14 border-x border-stone-300 bg-transparent py-2.5 text-center tnum dark:border-white/15"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="زيادة الكمية"
                  className="px-4 py-2.5 text-lg leading-none hover:text-brand-600"
                >
                  +
                </button>
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

          {/* شرائح الجملة */}
          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <h2 className="font-display text-sm font-bold">شرائح أسعار الجملة</h2>
            <table className="mt-3 w-full text-sm tnum">
              <thead>
                <tr className="text-xs text-stone-400">
                  <th className="pb-2 text-start font-medium">الكمية</th>
                  <th className="pb-2 text-start font-medium">سعر القطعة</th>
                  <th className="pb-2 text-end font-medium">التوفير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-white/10">
                <tr>
                  <td className="py-2">1 – {product.tiers[0] ? product.tiers[0].minQty - 1 : '∞'}</td>
                  <td className="py-2">{egp(product.price)}</td>
                  <td className="py-2 text-end text-stone-400">—</td>
                </tr>
                {product.tiers.map((t) => (
                  <tr key={t.minQty} className={qty >= t.minQty && buyerType === 'wholesale' ? 'text-accent-700 dark:text-accent-300' : ''}>
                    <td className="py-2">من {t.minQty}</td>
                    <td className="py-2 font-semibold">{egp(t.price)}</td>
                    <td className="py-2 text-end">{Math.round(((product.price - t.price) / product.price) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-stone-400">
              أسعار الجملة تظهر لحسابات التجار المعتمدة فقط بعد رفع السجل التجاري.
            </p>
          </div>

          {/* البائع */}
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <div>
              <div className="text-xs text-stone-400">يُباع ويُشحن بواسطة</div>
              <div className="mt-0.5 font-display font-bold">{vendor?.name}</div>
              <div className="mt-1 text-xs text-stone-400 tnum">
                {vendor?.city} · ★ {vendor?.rating}
                {vendor?.kind === 'own' && ' · مخازن أسواق'}
              </div>
            </div>
            {vendor?.kind === 'partner' && (
              <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
                بائع شريك
              </span>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-xl font-bold">منتجات من نفس الشكل</h2>
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
