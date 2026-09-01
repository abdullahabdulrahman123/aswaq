import { Link } from 'react-router-dom';
import { PastaShape } from '../components/PastaShape';
import { ProductCard } from '../components/ProductCard';
import { shapes, products, brands, vendors, rules, egp } from '../data/catalog';

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

export function HomePage() {
  const bestSellers = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
  const deals = products.filter((p) => p.oldPrice);
  const partners = vendors.filter((v) => v.kind === 'partner');

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* الهيرو */}
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-bl from-brand-50 via-brand-100 to-brand-50 dark:border-brand-500/20 dark:from-brand-900/40 dark:via-brand-800/25 dark:to-surface-card">
        <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-block rounded-full border border-brand-400/50 bg-white/60 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-white/5 dark:text-brand-300">
              أكبر تشكيلة معكرونة في مصر
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
              كل أنواع المعكرونة
              <br />
              <span className="text-brand-700 dark:text-brand-400">في مكان واحد.</span>
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-stone-600 dark:text-stone-300">
              سباجيتي، بيني، لازانيا، فارفالليه وأكتر — من ماركات موثوقة وبائعين معتمدين.
              أسعار تجزئة للبيت، وأسعار جملة للمحلات والمطاعم.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                ابدأ التسوق
              </Link>
              <Link
                to="/wholesale"
                className="rounded-xl border border-stone-300 bg-white/70 px-5 py-3 text-sm font-semibold transition hover:border-stone-400 dark:border-white/20 dark:bg-white/5"
              >
                عندك محل أو مطعم؟
              </Link>
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-brand-300/40 pt-5 text-sm dark:border-white/10">
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">توصيل</dt>
                <dd className="font-semibold">كل المحافظات</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">شحن مجاني فوق</dt>
                <dd className="font-semibold tnum">{egp(rules.freeShippingOver)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">الدفع</dt>
                <dd className="font-semibold">أونلاين أو عند الاستلام</dd>
              </div>
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              {(['spaghetti', 'farfalle', 'fusilli', 'shells'] as const).map((s, i) => (
                <div
                  key={s}
                  className={`rounded-2xl border border-brand-300/50 bg-white/70 p-2 shadow-card dark:border-white/10 dark:bg-white/5 ${
                    i % 2 ? 'translate-y-5' : ''
                  }`}
                >
                  <PastaShape shape={s} className="h-32 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* تسوق حسب الشكل */}
      <section className="mt-14">
        <SectionHead
          title="تسوق حسب الشكل"
          note="الزبون بيدوّر بالشكل قبل الماركة — ده أهم مدخل للكتالوج."
          to="/products"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {shapes.map((s) => (
            <Link
              key={s.id}
              to={`/products?shape=${s.id}`}
              className="group rounded-2xl border border-stone-200 bg-white p-3 text-center transition hover:border-brand-400 hover:shadow-card dark:border-white/10 dark:bg-surface-card dark:hover:border-brand-500/50"
            >
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30">
                <PastaShape shape={s.id} className="mx-auto h-20 w-20 transition-transform group-hover:scale-110" />
              </div>
              <div className="mt-2 text-sm font-semibold">{s.name}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-stone-400">{s.hint}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* الأكثر مبيعاً */}
      <section className="mt-14">
        <SectionHead title="الأكثر مبيعاً" to="/products?sort=best" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* بانر الجملة */}
      <section className="mt-14 overflow-hidden rounded-3xl bg-accent-700 text-white">
        <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">للمحلات والمطاعم</span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">أسعار جملة تنزل كل ما الكمية تزيد</h2>
            <p className="mt-3 max-w-lg leading-relaxed text-accent-100">
              سجّل حساب تاجر بالسجل التجاري، واتفعّل بعد المراجعة. هتشوف شرائح أسعار مختلفة،
              حد أدنى للطلب، وإمكانية طلب عرض سعر للكميات الكبيرة.
            </p>
            <Link
              to="/wholesale"
              className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-accent-700 transition hover:bg-accent-50"
            >
              اعرف التفاصيل
            </Link>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div className="text-xs text-accent-100">مثال — سباجيتي رفيع 400 جم</div>
            <table className="mt-3 w-full text-sm tnum">
              <tbody className="divide-y divide-white/15">
                <tr>
                  <td className="py-2">قطعة واحدة</td>
                  <td className="py-2 text-end font-semibold">28 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2">من 12 قطعة</td>
                  <td className="py-2 text-end font-semibold">25 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2">من 48 قطعة</td>
                  <td className="py-2 text-end font-semibold">22.5 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2">من 120 قطعة</td>
                  <td className="py-2 text-end font-semibold text-accent-300">20 ج.م</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* عروض */}
      {deals.length > 0 && (
        <section className="mt-14">
          <SectionHead title="عروض النهاردة" note="خصومات محدودة على منتجات مختارة." to="/products" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* الماركات والبائعين */}
      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">الماركات</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link
                key={b.id}
                to={`/products?brand=${b.id}`}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/10 dark:hover:text-brand-400"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">بائعون على أسواق</h2>
          <ul className="mt-4 space-y-3">
            {partners.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-xs text-stone-400">{v.city}</div>
                </div>
                <span className="tnum text-brand-600 dark:text-brand-400">★ {v.rating}</span>
              </li>
            ))}
          </ul>
          <Link to="/wholesale" className="mt-4 inline-block text-sm font-medium text-accent-600 dark:text-accent-400">
            عايز تبيع على أسواق؟ ←
          </Link>
        </div>
      </section>
    </div>
  );
}
