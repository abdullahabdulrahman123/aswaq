import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { egp, rules } from '../data/catalog';

const buyerSteps = [
  { t: 'سجّل حساب تاجر', d: 'بيانات النشاط + صورة السجل التجاري والبطاقة الضريبية.' },
  { t: 'مراجعة واعتماد', d: 'فريق أسواق بيراجع الأوراق ويفعّل الحساب.' },
  { t: 'أسعار الجملة تظهر', d: 'شرائح حسب الكمية على كل منتج، وحد أدنى مختلف للطلب.' },
  { t: 'اطلب أو اطلب عرض سعر', d: 'للكميات الكبيرة اللي مش مغطاة بالشرائح، تطلب عرض سعر مخصص.' },
];

const vendorPoints = [
  'لوحة تحكم لمنتجاتك وطلباتك وحالة الشحن',
  'العمولة بتتحسب أوتوماتيك على كل طلب',
  'تسوية دورية بعد انتهاء مهلة الإرجاع',
  'إنت تشحن بنفسك أو تخزّن في مخازن أسواق',
];

export function WholesalePage() {
  const { buyerType, setBuyerType } = useCart();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-3xl bg-accent-700 p-8 text-white sm:p-12">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">للمحلات والمطاعم والموزعين</span>
        <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
          اشترِ بالجملة من أسواق، بأسعار تنزل كل ما الكمية تزيد
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-accent-100">
          حساب تاجر واحد يديك أسعار مختلفة على كل الكتالوج، وفواتير، وإمكانية طلب عرض سعر للكميات الكبيرة.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setBuyerType(buyerType === 'wholesale' ? 'retail' : 'wholesale')}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-accent-700 transition hover:bg-accent-50"
          >
            {buyerType === 'wholesale' ? 'إيقاف معاينة أسعار الجملة' : 'عاين أسعار الجملة دلوقتي'}
          </button>
          <Link to="/products" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold transition hover:bg-white/10">
            تصفح الكتالوج
          </Link>
        </div>
      </section>

      {/* خطوات التاجر */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl">إزاي تفتح حساب تاجر</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {buyerSteps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
              <span className="font-mono text-sm text-brand-600 dark:text-brand-400">0{i + 1}</span>
              <h3 className="mt-2 font-display font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* القواعد التجارية */}
      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">القواعد الحالية</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            الأرقام دي مبدئية في النموذج، ومحتاجة تتحدد مع العميل.
          </p>
          <dl className="mt-4 divide-y divide-stone-200 text-sm dark:divide-white/10">
            <div className="flex justify-between py-3">
              <dt className="text-stone-500 dark:text-stone-400">الحد الأدنى للطلب</dt>
              <dd className="font-semibold tnum">{egp(rules.minOrderValue)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-stone-500 dark:text-stone-400">شحن مجاني فوق</dt>
              <dd className="font-semibold tnum">{egp(rules.freeShippingOver)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-stone-500 dark:text-stone-400">شحن ثابت مبدئي</dt>
              <dd className="font-semibold tnum">{egp(rules.flatShipping)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-stone-500 dark:text-stone-400">طرق الدفع</dt>
              <dd className="font-semibold">لسه مش محددة</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">عايز تبيع على أسواق؟</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            أسواق سوق مفتوح لموردي وموزعي المعكرونة.
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {vendorPoints.map((p) => (
              <li key={p} className="flex gap-2.5">
                <span className="mt-0.5 text-accent-600 dark:text-accent-400">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <button className="mt-5 w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-brand-500 dark:hover:bg-brand-600">
            قدّم كبائع
          </button>
          <p className="mt-3 text-center text-xs text-stone-400">
            نموذج التقديم لسه مش متبني — محتاج قرار العميل في المستندات المطلوبة.
          </p>
        </div>
      </section>
    </div>
  );
}
