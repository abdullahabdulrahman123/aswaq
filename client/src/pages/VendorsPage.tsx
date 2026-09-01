import { VendorCard } from '../components/VendorCard';
import { topVendors } from '../data/catalog';

export function VendorsPage() {
  const all = topVendors();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">الشركات على أسواق</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          مرتّبة بعدد الطلبات المكتملة. كل شركة ليها سوقها الخاص — والطلب الواحد بيكون من شركة واحدة
          عشان الشحن والإرجاع يفضلوا واضحين.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((v, i) => (
          <VendorCard key={v.id} vendor={v} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
