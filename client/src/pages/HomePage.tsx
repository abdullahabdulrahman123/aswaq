import { Link } from 'react-router-dom';
import { ProductArt } from '../components/ProductArt';

/**
 * الصفحة الرئيسية — الهيرو وبس دلوقتي.
 * أقسام المنتجات والشركات والتصنيفات اتشالت بطلب العميل لحد ما
 * يتحدد شكل الصفحة. الكود بتاعها في تاريخ جيت لو حبينا نرجّعها.
 */
export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
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
              واطلب من اللي يناسبك.
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
    </div>
  );
}
