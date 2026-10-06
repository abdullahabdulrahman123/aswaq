import { egp } from '../lib/money';

const dateFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long', timeStyle: 'short' });

export interface InvoiceLine {
  key: string;
  /** الصنف في المتجر (نسخة المتجر) — لـ«التسعير» من الفاتورة */
  itemId: string;
  item: string;
  unit: string;
  quantity: number;
  /** بالقرش. null = السعر لسه متحددش */
  price: number | null;
}

/** الفاتورة زي ما بتتعرض وتتطبع — من سلة على الجهاز أو من أوردر على السيرفر */
export interface InvoiceView {
  /** رقم الفاتورة. null = مسودة */
  number: number | null;
  businessName: string;
  storeName: string;
  date: Date;
  buyer: string;
  buyerPhone: string;
  method: 'pickup' | 'delivery' | null;
  address: string;
  lines: InvoiceLine[];
  /** بالقرش */
  total: number;
  /** بالكيلو. null = الأصناف ملهاش وزن متسجّل */
  weightKg: number | null;
  /** فيه صنف وزنه مش متسجّل — الوزن ممكن يبقى أقل من الحقيقة */
  measuresMissing?: boolean;
}

const amount = (n: number) => n.toLocaleString('en-EG', { maximumFractionDigits: 2 });

const cell = 'border border-gray-800 px-2 py-1.5 dark:border-gray-400 print:border-black';
const label = `${cell} bg-gray-100 font-semibold dark:bg-white/10 print:bg-gray-100`;

/**
 * الفاتورة بشكل فاتورة الهلال الورق اللي العميل بعتها (٢٥ سبتمبر): الصنف والكمية
 * والسعر والإجمالي في جدول بخطوط، وتحت إجمالي الكمية والوزن والمبلغ، والخانات
 * اللي بتتملي بإيد (حساب سابق، المدفوع، يعتمد) فاضية.
 *
 * مكالمة ٣٠ سبتمبر: اللي فوق الأصناف رأس الفاتورة من غير جدول ولا خطوط — اسم
 * الشركة والمتجر، ورقم الفاتورة والتاريخ، والعميل والاستلام. البائع والسائق
 * اتشالوا دلوقتي.
 *
 * مكالمة ٥ أكتوبر: خانة الحجم اتشالت — الوزن بس، زي الورق. الحجم لسه في الصنف
 * عشان تحميل العربية.
 *
 * onPrice (للبائع بس): اسم الصنف بيبقى زرار بيفتح «التسعير». في الورقة شكله نص عادي.
 *
 * بيانات الشركة الرسمية (س.ت، ب.ض، رخصة) وسطر آخر الفاتورة لسه مش متسجّلين
 * في النشاط، فمش ظاهرين.
 */
export function InvoiceSheet({ view, onPrice }: { view: InvoiceView; onPrice?: (line: InvoiceLine) => void }) {
  const totalQty = view.lines.reduce((n, l) => n + l.quantity, 0);
  const unpriced = view.lines.some((l) => l.price === null);

  return (
    <article
      aria-label="الفاتورة"
      className="bg-white text-sm text-gray-900 dark:bg-surface-card dark:text-gray-100 print:bg-white print:text-black"
    >
      <header className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight">{view.businessName}</p>
            {view.storeName && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 print:text-black">{view.storeName}</p>}
          </div>
          <div className="shrink-0 text-end">
            <p className="font-display text-lg font-bold leading-tight">
              {view.number === null ? (
                <>
                  فاتورة{' '}
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 align-middle text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 print:bg-transparent print:text-black">
                    مسودة
                  </span>
                </>
              ) : (
                <>فاتورة رقم {view.number}</>
              )}
            </p>
            <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400 print:text-black">{dateFormat.format(view.date)}</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <dt className="text-gray-500 dark:text-gray-400 print:text-black">العميل</dt>
          <dd className="font-semibold">
            {view.buyer}
            {view.buyerPhone && (
              <span dir="ltr" className="ms-2 inline-block font-normal tabular-nums">
                {view.buyerPhone}
              </span>
            )}
          </dd>
          {view.method && (
            <>
              <dt className="text-gray-500 dark:text-gray-400 print:text-black">الاستلام</dt>
              <dd>{view.method === 'pickup' ? 'من المتجر' : 'توصيل'}</dd>
            </>
          )}
          {view.method === 'delivery' && view.address && (
            <>
              <dt className="text-gray-500 dark:text-gray-400 print:text-black">العنوان</dt>
              <dd className="break-words">{view.address}</dd>
            </>
          )}
        </dl>
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${label} w-[40%] text-center`}>الصنف</th>
            <th className={`${label} text-center`}>الكمية</th>
            <th className={`${label} text-center`}>السعر</th>
            <th className={`${label} text-center`}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {view.lines.map((l) => (
            <tr key={l.key}>
              <td className={`${cell} font-semibold`}>
                {onPrice ? (
                  <button
                    type="button"
                    onClick={() => onPrice(l)}
                    aria-label={`تسعير ${l.item}`}
                    className="text-start font-semibold underline decoration-gray-300 decoration-dotted underline-offset-4 hover:text-brand-700 dark:decoration-white/25 dark:hover:text-brand-400 print:no-underline"
                  >
                    {l.item} <span className="font-normal text-gray-500 dark:text-gray-400 print:text-black">({l.unit})</span>
                  </button>
                ) : (
                  <>
                    {l.item} <span className="font-normal text-gray-500 dark:text-gray-400 print:text-black">({l.unit})</span>
                  </>
                )}
              </td>
              <td className={`${cell} text-center tabular-nums`}>{l.quantity}</td>
              <td className={`${cell} text-center tabular-nums`}>{l.price === null ? '—' : egp(l.price)}</td>
              <td className={`${cell} text-center font-semibold tabular-nums`}>{l.price === null ? '—' : egp(l.price * l.quantity)}</td>
            </tr>
          ))}
          <tr>
            <td className={`${label} text-center`}>الكمية</td>
            <td className={`${cell} text-center font-bold tabular-nums`}>{totalQty}</td>
            <td className={`${label} text-center`}>الإجمالي</td>
            <td className={`${cell} text-center font-bold tabular-nums`}>{egp(view.total)}</td>
          </tr>
          <tr>
            <td className={`${label} text-center`}>الوزن</td>
            <td className={`${cell} text-center tabular-nums`}>{view.weightKg === null ? '—' : `${amount(view.weightKg)} كجم`}</td>
            <td className={`${label} text-center`}>حساب سابق</td>
            <td className={cell} />
          </tr>
          <tr>
            <td className={`${label} text-center`}>يعتمد</td>
            <td className={`${label} text-center`}>إجمالي المبلغ</td>
            <td className={`${cell} text-center text-base font-bold tabular-nums`} colSpan={2}>
              {egp(view.total)}
            </td>
          </tr>
          <tr>
            <td className={`${cell} h-12`} />
            <td className={`${label} text-center`}>المدفوع</td>
            <td className={cell} colSpan={2} />
          </tr>
        </tbody>
      </table>

      {/* نص العميل (٢٧ سبتمبر)، من غير الحجم من ٥ أكتوبر */}
      {view.measuresMissing && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 print:text-black">
          ربما تكون هذه الحسابات غير دقيقة نتيجة لعدم تسجيل الوزن لبعض الأصناف.
        </p>
      )}

      {unpriced && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 print:text-black">
          فيه أصناف سعرها لسه متحددش (—) ومش محسوبة في الإجمالي.
        </p>
      )}
    </article>
  );
}
