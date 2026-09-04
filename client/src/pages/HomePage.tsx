import { Link } from 'react-router-dom';
import { ProductArt } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { VendorCard } from '../components/VendorCard';
import { categories, offers, products, productById, topVendors, variantById } from '../data/catalog';

function SectionHead({ title, note, to }: { title: string; note?: string; to?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {note && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{note}</p>}
      </div>
      {to && (
        <Link to={to} className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          عرض الكل ←
        </Link>
      )}
    </div>
  );
}

/** الأصناف مرتّبة بإجمالي مبيعات عروض الشركات عليها */
function bestSelling(limit: number) {
  const totals = new Map<string, number>();
  for (const o of offers) {
    const productId = variantById(o.variantId)?.productId;
    if (!productId) continue;
    totals.set(productId, (totals.get(productId) ?? 0) + o.sold);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => productById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

export function HomePage() {
  const bestSellers = bestSelling(8);
  const leaders = topVendors().slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* الهيرو */}
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-bl from-brand-50 via-brand-100 to-brand-50 dark:border-brand-500/20 dark:from-brand-900/40 dark:via-brand-800/25 dark:to-surface-card">
        <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-block rounded-full border border-brand-400/50 bg-white/60 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-white/5 dark:text-brand-300">
              منصة بيع للشركات
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
              شركات بتبيع،
              <br />
              <span className="text-brand-700 dark:text-brand-400">وإنت بتختار.</span>
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-stone-600 dark:text-stone-300">
              كل شركة بتعرض منتجاتها وأسعارها على أسواق. اتصفّح، قارن بين الشركات،
              واطلب من اللي يناسبك — وكل طلب من شركة واحدة عشان الشحن والإرجاع يفضلوا واضحين.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                ابدأ التسوق
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              {(['grocery', 'beverages', 'kitchen', 'packaging'] as const).map((c, i) => (
                <div
                  key={c}
                  className={`rounded-2xl border border-brand-300/50 bg-white/70 p-2 shadow-card dark:border-white/10 dark:bg-white/5 ${
                    i % 2 ? 'translate-y-5' : ''
                  }`}
                >
                  <ProductArt category={c} className="h-32 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* الأكثر مبيعاً من الشركات */}
      <section className="mt-14">
        <SectionHead
          title="الأكثر مبيعاً من الشركات"
          note="أعلى المنتجات مبيعاً على أسواق. اضغط على أي منتج تشوف الشركة البائعة وتدخل سوقها."
          to="/products"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* الشركات */}
      <section className="mt-14">
        <SectionHead
          title="الشركات الأكتر مبيعاً"
          note="شركات موثّقة راجعنا أوراقها. ادخل سوق أي شركة وتسوق منها لوحدها."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leaders.map((v, i) => (
            <VendorCard key={v.id} vendor={v} rank={i + 1} />
          ))}
        </div>
      </section>

      {/* التصنيفات */}
      <section className="mt-14">
        <SectionHead title="تصفّح حسب التصنيف" to="/products" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.id}`}
              className="group rounded-2xl border border-stone-200 bg-white p-3 text-center transition hover:border-brand-400 hover:shadow-card dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/50"
            >
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30">
                <ProductArt category={c.id} className="mx-auto h-20 w-20 transition-transform group-hover:scale-110" />
              </div>
              <div className="mt-2 text-sm font-semibold leading-tight">{c.name}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-stone-400">
                {products.filter((p) => p.category === c.id).length} منتج
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
