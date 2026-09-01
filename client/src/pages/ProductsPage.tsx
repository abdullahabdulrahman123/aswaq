import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import {
  products,
  shapes,
  brands,
  vendors,
  brandById,
  type Product,
  type ShapeId,
} from '../data/catalog';

type Sort = 'best' | 'price-asc' | 'price-desc' | 'rating';

const sortLabels: Record<Sort, string> = {
  best: 'الأكثر مبيعاً',
  'price-asc': 'الأقل سعراً',
  'price-desc': 'الأعلى سعراً',
  rating: 'الأعلى تقييماً',
};

const weightBuckets = [
  { id: 'sm', label: 'حتى 400 جم', test: (p: Product) => p.weight <= 400 },
  { id: 'md', label: '401 – 700 جم', test: (p: Product) => p.weight > 400 && p.weight <= 700 },
  { id: 'lg', label: 'أكبر من 700 جم', test: (p: Product) => p.weight > 700 },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-stone-200 py-4 last:border-0 dark:border-white/10">
      <h3 className="mb-3 font-display text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
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
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim().toLowerCase() ?? '';

  const [selShapes, setSelShapes] = useState<ShapeId[]>(() => {
    const s = params.get('shape') as ShapeId | null;
    return s ? [s] : [];
  });
  const [selBrands, setSelBrands] = useState<string[]>(() => {
    const b = params.get('brand');
    return b ? [b] : [];
  });
  const [selWeights, setSelWeights] = useState<string[]>([]);
  const [onlyOwn, setOnlyOwn] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) || 'best');
  const [filtersOpen, setFiltersOpen] = useState(false);

  function toggle<T>(list: T[], value: T, set: (v: T[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function clearAll() {
    setSelShapes([]);
    setSelBrands([]);
    setSelWeights([]);
    setOnlyOwn(false);
    setInStockOnly(false);
    setParams({});
  }

  const results = useMemo(() => {
    let list = products.filter((p) => {
      if (query) {
        const haystack = `${p.name} ${brandById(p.brandId)?.name ?? ''} ${p.shape}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (selShapes.length && !selShapes.includes(p.shape)) return false;
      if (selBrands.length && !selBrands.includes(p.brandId)) return false;
      if (selWeights.length) {
        const buckets = weightBuckets.filter((b) => selWeights.includes(b.id));
        if (!buckets.some((b) => b.test(p))) return false;
      }
      if (onlyOwn && p.vendorId !== 'aswaq') return false;
      if (inStockOnly && p.stock === 0) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return b.reviews - a.reviews;
    });

    return list;
  }, [query, selShapes, selBrands, selWeights, onlyOwn, inStockOnly, sort]);

  const activeCount =
    selShapes.length + selBrands.length + selWeights.length + (onlyOwn ? 1 : 0) + (inStockOnly ? 1 : 0);

  const filters = (
    <>
      <FilterGroup title="الشكل">
        {shapes.map((s) => (
          <Check
            key={s.id}
            label={s.name}
            checked={selShapes.includes(s.id)}
            onChange={() => toggle(selShapes, s.id, setSelShapes)}
            count={products.filter((p) => p.shape === s.id).length}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="الماركة">
        {brands.map((b) => (
          <Check
            key={b.id}
            label={b.name}
            checked={selBrands.includes(b.id)}
            onChange={() => toggle(selBrands, b.id, setSelBrands)}
            count={products.filter((p) => p.brandId === b.id).length}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="وزن العبوة">
        {weightBuckets.map((w) => (
          <Check
            key={w.id}
            label={w.label}
            checked={selWeights.includes(w.id)}
            onChange={() => toggle(selWeights, w.id, setSelWeights)}
            count={products.filter(w.test).length}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="البائع والتوفر">
        <Check label="شحن أسواق فقط" checked={onlyOwn} onChange={() => setOnlyOwn(!onlyOwn)} />
        <Check label="المتوفر فقط" checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          {vendors.filter((v) => v.kind === 'partner').length} بائعين شركاء بيشحنوا بنفسهم.
        </p>
      </FilterGroup>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {query ? `نتائج البحث عن "${query}"` : 'كل المنتجات'}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 tnum">{results.length} منتج</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* الفلاتر — جانبية على الشاشات الكبيرة */}
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
              onClick={() => setFiltersOpen((v) => !v)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium lg:hidden dark:border-white/15"
            >
              تصفية {activeCount > 0 && `(${activeCount})`}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="sort" className="text-stone-500 dark:text-stone-400">
                ترتيب:
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-surface-card"
              >
                {(Object.keys(sortLabels) as Sort[]).map((s) => (
                  <option key={s} value={s}>
                    {sortLabels[s]}
                  </option>
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
