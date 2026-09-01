import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import {
  productsOfVendor,
  shapeById,
  topVendors,
  vendorById,
  vendorOffers,
  vendorInitials,
  egp,
  type ShapeId,
} from '../data/catalog';

export function VendorPage() {
  const { id } = useParams();
  const vendor = id ? vendorById(id) : undefined;
  const { vendorId: cartVendorId } = useCart();
  const [shapeFilter, setShapeFilter] = useState<ShapeId | 'all'>('all');

  const vendorProducts = useMemo(() => (vendor ? productsOfVendor(vendor.id) : []), [vendor]);

  const availableShapes = useMemo(() => {
    const set = new Set(vendorProducts.map((p) => p.shape));
    return [...set];
  }, [vendorProducts]);

  const shown = useMemo(
    () => (shapeFilter === 'all' ? vendorProducts : vendorProducts.filter((p) => p.shape === shapeFilter)),
    [vendorProducts, shapeFilter],
  );

  if (!vendor) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">الشركة غير موجودة</h1>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline dark:text-brand-400">
          ارجع للرئيسية
        </Link>
      </div>
    );
  }

  const myOffers = vendorOffers(vendor.id);
  const cheapest = myOffers.length
    ? Math.min(...myOffers.filter((o) => o.stock > 0).map((o) => o.price))
    : 0;
  const isCartVendor = cartVendorId === vendor.id;
  const others = topVendors().filter((v) => v.id !== vendor.id).slice(0, 3);

  return (
    <div>
      {/* واجهة سوق الشركة */}
      <header className="border-b border-stone-200 bg-gradient-to-bl from-brand-50 to-brand-100 dark:border-white/10 dark:from-brand-900/40 dark:to-surface-card">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <Link to="/" className="hover:text-brand-600">الرئيسية</Link>
            <span aria-hidden="true">/</span>
            <span>سوق {vendor.name}</span>
          </nav>

          <div className="flex flex-wrap items-start gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white font-display text-2xl font-bold text-brand-800 shadow-card dark:bg-white/10 dark:text-brand-200">
              {vendorInitials(vendor.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">{vendor.name}</h1>
                {vendor.verified && (
                  <span className="rounded-md bg-accent-600 px-2 py-0.5 text-xs font-semibold text-white">✓ موثّقة</span>
                )}
                {vendor.kind === 'own' && (
                  <span className="rounded-md bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">مخازن أسواق</span>
                )}
              </div>

              <p className="mt-2 max-w-xl leading-relaxed text-stone-600 dark:text-stone-300">{vendor.tagline}</p>

              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">التقييم</dt>
                  <dd className="font-display font-bold text-brand-700 tnum dark:text-brand-400">★ {vendor.rating}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">طلبات مكتملة</dt>
                  <dd className="font-display font-bold tnum">{vendor.sales.toLocaleString('en-EG')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">الأصناف</dt>
                  <dd className="font-display font-bold tnum">{vendorProducts.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">المقر</dt>
                  <dd className="font-display font-bold">{vendor.city}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">الأسعار تبدأ من</dt>
                  <dd className="font-display font-bold tnum">{egp(cheapest)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {isCartVendor && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white">
              ✓ سلتك الحالية من الشركة دي — كمّل تسوق عادي
            </p>
          )}
          {!isCartVendor && cartVendorId && (
            <p className="mt-6 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              سلتك دلوقتي من <strong>{vendorById(cartVendorId)?.name}</strong>. الطلب الواحد من شركة واحدة —
              لو ضفت من هنا هنسألك الأول.
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* فلترة سريعة بالشكل جوه سوق الشركة */}
        {availableShapes.length > 1 && (
          <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setShapeFilter('all')}
              className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition ${
                shapeFilter === 'all'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-stone-300 hover:border-brand-400 dark:border-white/15'
              }`}
            >
              الكل ({vendorProducts.length})
            </button>
            {availableShapes.map((s) => (
              <button
                key={s}
                onClick={() => setShapeFilter(s)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  shapeFilter === s
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-stone-300 hover:border-brand-400 dark:border-white/15'
                }`}
              >
                {shapeById(s)?.name}
              </button>
            ))}
          </div>
        )}

        <h2 className="mb-5 font-display text-xl font-bold">
          منتجات {vendor.name}
          <span className="ms-2 text-sm font-normal text-stone-400 tnum">({shown.length})</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} onlyVendorId={vendor.id} />
          ))}
        </div>

        {/* شركات تانية */}
        <section className="mt-16 border-t border-stone-200 pt-8 dark:border-white/10">
          <h2 className="mb-4 font-display text-lg font-bold">شركات تانية على أسواق</h2>
          <div className="flex flex-wrap gap-3">
            {others.map((v) => (
              <Link
                key={v.id}
                to={`/vendor/${v.id}`}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 transition hover:border-brand-400 dark:border-white/10 dark:bg-surface-card"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 font-display text-sm font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
                  {vendorInitials(v.name)}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{v.name}</span>
                  <span className="block text-xs text-stone-400 tnum">★ {v.rating} · {v.city}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
