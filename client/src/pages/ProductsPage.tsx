import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import {
  products,
  shapes,
  brands,
  vendors,
  offersForProduct,
  brandById,
  variantById,
  vendorById,
  type Product,
} from '../data/catalog';

type Sort = 'best' | 'price-asc' | 'price-desc' | 'rating';

const sortLabels: Record<Sort, string> = {
  best: 'الأكثر مبيعاً',
  'price-asc': 'الأقل سعراً',
  'price-desc': 'الأعلى سعراً',
  rating: 'الأعلى تقييماً',
};

const weightBuckets = [
  { id: 'sm', label: 'حتى 400 جم', test: (w: number) => w <= 400 },
  { id: 'md', label: '401 – 700 جم', test: (w: number) => w > 400 && w <= 700 },
  { id: 'lg', label: 'أكبر من 700 جم', test: (w: number) => w > 700 },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-stone-200 py-4 last:border-0 dark:border-white/10">
      <h3 className="mb-3 font-display text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500 dark:border-white/20 dark:bg-transparent"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-stone-400 tnum">{count}</span>}
    </label>
  );
}

export function ProductsPage() {
  /**
   * الفلاتر كلها في الـURL وبس — مفيش نسخة تانية في state محلي.
   * كده زرار الرجوع في المتصفح بيشتغل، والفلترة بقت لينك تقدر تبعته لحد.
   */
  const [params, setParams] = useSearchParams();
  const { vendorId: cartVendorId } = useCart();

  const query = (params.get('q') ?? '').trim().toLowerCase();
  const selShapes = params.getAll('shape');
  const selBrands = params.getAll('brand');
  const selWeights = params.getAll('weight');
  const selVendors = params.getAll('vendor');
  const inStockOnly = params.get('stock') === '1';
  const filtersOpen = params.get('filters') === '1';
  const sort = (params.get('sort') as Sort) || 'best';

  function update(mutate: (p: URLSearchParams) => void, replace = false) {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace });
  }

  function toggleValue(key: string, value: string) {
    update((p) => {
      const current = p.getAll(key);
      p.delete(key);
      const nextValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      nextValues.forEach((v) => p.append(key, v));
    });
  }

  function clearAll() {
    update((p) => {
      ['shape', 'brand', 'weight', 'vendor', 'stock'].forEach((k) => p.delete(k));
    });
  }

  /** أرخص عرض متاح للصنف — أساس الفرز والفلترة بالسعر */
  const cheapestOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const list = offersForProduct(p.id).filter((o) => o.stock > 0);
      const pool = list.length ? list : offersForProduct(p.id);
      if (pool.length) map.set(p.id, Math.min(...pool.map((o) => o.price)));
    }
    return map;
  }, []);

  const soldOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.id, offersForProduct(p.id).reduce((sum, o) => sum + o.sold, 0));
    }
    return map;
  }, []);

  const ratingOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const list = offersForProduct(p.id);
      map.set(p.id, list.length ? Math.max(...list.map((o) => o.rating)) : 0);
    }
    return map;
  }, []);

  const results = useMemo(() => {
    const matches = (p: Product) => {
      const productOffers = offersForProduct(p.id);

      if (query) {
        const haystack = `${p.name} ${brandById(p.brandId)?.name ?? ''} ${p.shape}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (selShapes.length && !selShapes.includes(p.shape)) return false;
      if (selBrands.length && !selBrands.includes(p.brandId)) return false;

      if (selWeights.length) {
        const buckets = weightBuckets.filter((b) => selWeights.includes(b.id));
        const weights = productOffers
          .map((o) => variantById(o.variantId)?.weight ?? 0)
          .filter(Boolean);
        if (!weights.some((w) => buckets.some((b) => b.test(w)))) return false;
      }

      if (selVendors.length && !productOffers.some((o) => selVendors.includes(o.vendorId))) return false;
      if (inStockOnly && !productOffers.some((o) => o.stock > 0)) return false;

      return true;
    };

    return products.filter(matches).sort((a, b) => {
      if (sort === 'price-asc') return (cheapestOf.get(a.id) ?? 0) - (cheapestOf.get(b.id) ?? 0);
      if (sort === 'price-desc') return (cheapestOf.get(b.id) ?? 0) - (cheapestOf.get(a.id) ?? 0);
      if (sort === 'rating') return (ratingOf.get(b.id) ?? 0) - (ratingOf.get(a.id) ?? 0);
      return (soldOf.get(b.id) ?? 0) - (soldOf.get(a.id) ?? 0);
    });
  }, [query, selShapes, selBrands, selWeights, selVendors, inStockOnly, sort, cheapestOf, soldOf, ratingOf]);

  const activeCount =
    selShapes.length + selBrands.length + selWeights.length + selVendors.length + (inStockOnly ? 1 : 0);

  const countByShape = (id: string) => products.filter((p) => p.shape === id).length;
  const countByBrand = (id: string) => products.filter((p) => p.brandId === id).length;
  const countByVendor = (id: string) =>
    products.filter((p) => offersForProduct(p.id).some((o) => o.vendorId === id)).length;

  const filters = (
    <>
      <FilterGroup title="الشكل">
        {shapes.map((s) => (
          <Check key={s.id} label={s.name} checked={selShapes.includes(s.id)} onChange={() => toggleValue('shape', s.id)} count={countByShape(s.id)} />
        ))}
      </FilterGroup>

      <FilterGroup title="الماركة">
        {brands.map((b) => (
          <Check key={b.id} label={b.name} checked={selBrands.includes(b.id)} onChange={() => toggleValue('brand', b.id)} count={countByBrand(b.id)} />
        ))}
      </FilterGroup>

      <FilterGroup title="وزن العبوة">
        {weightBuckets.map((w) => (
          <Check key={w.id} label={w.label} checked={selWeights.includes(w.id)} onChange={() => toggleValue('weight', w.id)} />
        ))}
      </FilterGroup>

      <FilterGroup title="الشركة">
        {vendors.map((v) => (
          <Check key={v.id} label={v.name} checked={selVendors.includes(v.id)} onChange={() => toggleValue('vendor', v.id)} count={countByVendor(v.id)} />
        ))}
      </FilterGroup>

      <FilterGroup title="التوفر">
        <Check label="المتوفر فقط" checked={inStockOnly} onChange={() => update((p) => (inStockOnly ? p.delete('stock') : p.set('stock', '1')))} />
      </FilterGroup>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {query ? `نتائج البحث عن "${query}"` : 'كل المنتجات'}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 tnum">{results.length} صنف</p>
      </div>

      {cartVendorId && (
        <p className="mb-6 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
          سلتك من <strong>{vendorById(cartVendorId)?.name}</strong> — بنعرضلك عروضها الأول لأن الطلب الواحد من شركة واحدة.
          {' '}
          <button onClick={() => toggleValue('vendor', cartVendorId)} className="underline underline-offset-2">
            اعرض منتجاتها بس
          </button>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border border-stone-200 bg-white px-5 dark:border-white/10 dark:bg-surface-card">
            <div className="flex items-center justify-between border-b border-stone-200 py-4 dark:border-white/10">
              <span className="font-display text-sm font-bold">تصفية</span>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                  مسح ({activeCount})
                </button>
              )}
            </div>
            {filters}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => update((p) => (filtersOpen ? p.delete('filters') : p.set('filters', '1')), true)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium lg:hidden dark:border-white/15"
            >
              تصفية {activeCount > 0 && `(${activeCount})`}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="sort" className="text-stone-500 dark:text-stone-400">ترتيب:</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => update((p) => p.set('sort', e.target.value))}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-surface-card"
              >
                {(Object.keys(sortLabels) as Sort[]).map((s) => (
                  <option key={s} value={s}>{sortLabels[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-6 rounded-2xl border border-stone-200 bg-white px-5 lg:hidden dark:border-white/10 dark:bg-surface-card">
              {filters}
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-white/15">
              <p className="font-display text-lg font-bold">مفيش نتائج</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">جرّب تشيل بعض الفلاتر أو تغيّر كلمة البحث.</p>
              <button onClick={clearAll} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
