import { Link } from 'react-router-dom';
import { PastaShape } from '../components/PastaShape';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { unitPrice, nextTier } from '../lib/pricing';
import {
  offerById,
  brandById,
  vendorById,
  variantById,
  productById,
  rules,
  egp,
  vendorInitials,
} from '../data/catalog';

export function CartPage() {
  const { lines, vendorId, setQty, remove, clear, buyerType, subtotal, shipping, total, weight, meetsMinimum } = useCart();
  const { user, openGate } = useAuth();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mx-auto h-32 w-32 opacity-40">
          <PastaShape shape="farfalle" className="h-full w-full" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">السلة فاضية</h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400">ابدأ تتصفح المنتجات وضيف اللي يعجبك.</p>
        <Link to="/products" className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600">
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  const vendor = vendorId ? vendorById(vendorId) : undefined;
  const missing = rules.minOrderValue - subtotal;
  const toFreeShipping = rules.freeShippingOver - subtotal;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">السلة</h1>
        <button onClick={clear} className="text-sm text-stone-500 hover:text-red-600 dark:text-stone-400">
          إفراغ السلة
        </button>
      </div>

      {/* الطلب من شركة واحدة — نوضّحها فوق */}
      {vendor && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white font-display text-sm font-bold text-brand-800 dark:bg-white/10 dark:text-brand-200">
            {vendorInitials(vendor.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-stone-500 dark:text-stone-400">طلبك من</div>
            <div className="flex items-center gap-1.5 font-display font-bold">
              {vendor.name}
              {vendor.verified && <span className="text-accent-600 dark:text-accent-400" title="موثّقة">✓</span>}
            </div>
            <div className="mt-0.5 text-xs text-stone-400 tnum">
              {vendor.city} · ★ {vendor.rating} · الوزن الكلي {(weight / 1000).toFixed(2)} كجم
            </div>
          </div>
          <Link
            to={`/vendor/${vendor.id}`}
            className="whitespace-nowrap rounded-lg border border-brand-400 px-3 py-2 text-xs font-semibold text-brand-800 transition hover:bg-white dark:border-brand-500/40 dark:text-brand-200"
          >
            كمّل تسوق من {vendor.name} ←
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {lines.map((line) => {
            const offer = offerById(line.offerId);
            if (!offer) return null;
            const variant = variantById(offer.variantId);
            const product = variant ? productById(variant.productId) : undefined;
            if (!variant || !product) return null;

            const price = unitPrice(offer, line.qty, buyerType);
            const upcoming = buyerType === 'wholesale' ? nextTier(offer, line.qty) : undefined;

            return (
              <li key={line.offerId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-surface-card">
                <Link to={`/product/${product.id}`} className="shrink-0 rounded-xl bg-brand-50 dark:bg-brand-900/30">
                  <PastaShape shape={product.shape} className="h-20 w-20" />
                </Link>

                <div className="min-w-[160px] flex-1">
                  <div className="text-xs text-stone-400">{brandById(product.brandId)?.name}</div>
                  <Link to={`/product/${product.id}`} className="font-display font-bold hover:text-brand-600">
                    {product.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-stone-400 tnum">{variant.weight} جم</div>
                  {upcoming && (
                    <div className="mt-1 text-xs text-accent-600 tnum dark:text-accent-400">
                      زوّد لـ{upcoming.minQty} والسعر ينزل لـ{egp(upcoming.price)}
                    </div>
                  )}
                  {line.qty > offer.stock && offer.stock > 0 && (
                    <div className="mt-1 text-xs text-amber-700 tnum dark:text-amber-400">
                      المتاح {offer.stock} قطعة بس
                    </div>
                  )}
                </div>

                <div className="flex items-center rounded-xl border border-stone-300 dark:border-white/15">
                  <button onClick={() => setQty(line.offerId, line.qty - 1)} aria-label="تقليل" className="px-3 py-2 leading-none hover:text-brand-600">−</button>
                  <span className="w-10 border-x border-stone-300 py-2 text-center text-sm tnum dark:border-white/15">{line.qty}</span>
                  <button onClick={() => setQty(line.offerId, line.qty + 1)} aria-label="زيادة" className="px-3 py-2 leading-none hover:text-brand-600">+</button>
                </div>

                <div className="w-24 text-end">
                  <div className="font-display font-bold tnum">{egp(price * line.qty)}</div>
                  <div className="text-xs text-stone-400 tnum">{egp(price)} × {line.qty}</div>
                </div>

                <button onClick={() => remove(line.offerId)} aria-label={`حذف ${product.name}`} className="text-stone-400 transition hover:text-red-600">
                  ✕
                </button>
              </li>
            );
          })}
        </ul>

        <aside>
          <div className="sticky top-32 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
            <h2 className="font-display text-lg font-bold">ملخص الطلب</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500 dark:text-stone-400">المجموع الفرعي</dt>
                <dd className="tnum font-medium">{egp(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500 dark:text-stone-400">الشحن</dt>
                <dd className="tnum font-medium">{shipping === 0 ? 'مجاني' : egp(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base dark:border-white/10">
                <dt className="font-display font-bold">الإجمالي</dt>
                <dd className="font-display font-bold tnum">{egp(total)}</dd>
              </div>
            </dl>

            {!meetsMinimum && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 tnum dark:bg-amber-500/10 dark:text-amber-300">
                الحد الأدنى للطلب {egp(rules.minOrderValue)} — ناقصك {egp(missing)}.
              </p>
            )}

            {meetsMinimum && toFreeShipping > 0 && (
              <p className="mt-4 rounded-lg bg-accent-50 px-3 py-2.5 text-sm text-accent-700 tnum dark:bg-accent-500/10 dark:text-accent-300">
                ضيف {egp(toFreeShipping)} كمان والشحن يبقى مجاني.
              </p>
            )}

            <button
              disabled={!meetsMinimum}
              onClick={() => {
                // الزائر يتسوق عادي، وأول ما يقرر يشتري بنطلب التسجيل
                if (!user) return openGate('login');
              }}
              className="mt-5 w-full rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 dark:bg-brand-500 dark:hover:bg-brand-600 dark:disabled:bg-white/10 dark:disabled:text-stone-500"
            >
              {user ? 'إتمام الطلب' : 'سجّل دخولك وأتمّ الطلب'}
            </button>

            {user ? (
              <p className="mt-3 text-center text-xs text-stone-400">
                صفحة الدفع لسه مش متبنية — محتاجة قرار العميل في طرق الدفع.
              </p>
            ) : (
              <p className="mt-3 text-center text-xs leading-relaxed text-stone-400">
                بتتسوق كزائر. التسجيل عبر وصلة مطلوب عند إتمام الطلب بس.
              </p>
            )}

            <div className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-400 dark:border-white/10">
              {buyerType === 'wholesale'
                ? 'أسعار جملة مطبقة. الحساب التجاري محتاج اعتماد الإدارة في النسخة الحقيقية.'
                : 'أسعار تجزئة. لو عندك محل أو مطعم، فعّل وضع الجملة من الشريط العلوي.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
