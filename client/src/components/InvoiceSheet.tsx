import { egp } from '../data/catalog';

const dateFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long', timeStyle: 'short' });

export interface InvoiceLine {
  key: string;
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
  seller: string;
  method: 'pickup' | 'delivery' | null;
  address: string;
  lines: InvoiceLine[];
  /** بالقرش */
  total: number;
  /** بالكيلو. null = الأصناف ملهاش وزن متسجّل */
  weightKg: number | null;
}

const cell = 'border border-stone-800 px-2 py-1.5 dark:border-stone-400 print:border-black';
const label = `${cell} bg-stone-100 font-semibold dark:bg-white/10 print:bg-stone-100`;

/**
 * الفاتورة بشكل فاتورة الهلال الورق اللي العميل بعتها (٢٥ سبتمبر): جدول بخطوط،
 * فوق رقم الفاتورة واسم الشركة، وجنبه التاريخ والعميل والبائع والسائق، وبعدين
 * الصنف والكمية والسعر والإجمالي، وتحت إجمالي الكمية والوزن والمبلغ، والخانات
 * اللي بتتملي بإيد (حساب سابق، المدفوع، يعتمد) فاضية.
 *
 * بيانات الشركة الرسمية (س.ت، ب.ض، رخصة) وسطر آخر الفاتورة لسه مش متسجّلين
 * في النشاط، فمش ظاهرين.
 */
export function InvoiceSheet({ view }: { view: InvoiceView }) {
  const totalQty = view.lines.reduce((n, l) => n + l.quantity, 0);
  const unpriced = view.lines.some((l) => l.price === null);

  return (
    <article
      aria-label="الفاتورة"
      className="bg-white text-sm text-stone-900 dark:bg-surface-card dark:text-stone-100 print:bg-white print:text-black"
    >
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${label} text-center text-base`} colSpan={2}>
              فاتورة رقم {view.number ?? '—'}
            </td>
            <td className={`${cell} text-center`} colSpan={2}>
              {view.number === null && <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 print:text-black">مسودة</span>}
            </td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`} colSpan={2} rowSpan={view.method === 'delivery' ? 5 : 4}>
              <span className="block text-base">{view.businessName}</span>
              <span className="mt-1 block text-xs font-normal text-stone-500 dark:text-stone-400 print:text-black">{view.storeName}</span>
            </td>
            <td className={label}>التاريخ</td>
            <td className={cell}>{dateFormat.format(view.date)}</td>
          </tr>
          <tr>
            <td className={label}>العميل</td>
            <td className={cell}>
              {view.buyer}
              {view.buyerPhone && (
                <span dir="ltr" className="block text-end tabular-nums">
                  {view.buyerPhone}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td className={label}>البائع</td>
            <td className={cell}>{view.seller}</td>
          </tr>
          <tr>
            <td className={label}>{view.method === 'delivery' ? 'السائق' : 'الاستلام'}</td>
            <td className={cell}>{view.method === 'pickup' ? 'من المتجر' : ''}</td>
          </tr>
          {view.method === 'delivery' && (
            <tr>
              <td className={label}>العنوان</td>
              <td className={`${cell} break-words`}>{view.address}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="mt-[-1px] w-full border-collapse">
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
                {l.item} <span className="font-normal text-stone-500 dark:text-stone-400 print:text-black">({l.unit})</span>
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
            <td className={`${cell} text-center tabular-nums`}>{view.weightKg === null ? '—' : `${view.weightKg.toLocaleString('en-EG', { maximumFractionDigits: 1 })} كجم`}</td>
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

      {unpriced && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 print:text-black">
          فيه أصناف سعرها لسه متحددش (—) ومش محسوبة في الإجمالي.
        </p>
      )}
    </article>
  );
}
