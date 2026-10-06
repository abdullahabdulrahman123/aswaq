/**
 * ميعاد التسليم وملاحظاته (رسالة العميل ٦ أكتوبر): «واحد طالب دلوقتي بس عايزها يوم
 * السبت» — تاريخ وساعة بيتحفظوا DateTime، وخانة «ملاحظات التسليم» للسواق. الافتراضي
 * «دلوقتي» (ساعة التحرير) مع كل فاتورة جديدة، والمحفوظة بتفتح على ميعادها.
 */
export interface Delivery {
  /** ISO — فاضي = لسه متحددش */
  deliveryAt: string | null;
  deliveryNotes: string;
}

/** دلوقتي من غير ثواني — نفس اللي بيظهر في الخانة */
export function nowMinute(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

export const newDelivery = (): Delivery => ({ deliveryAt: nowMinute(), deliveryNotes: '' });

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO ← قيمة datetime-local بتوقيت الجهاز (2026-10-11T14:30) */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** قيمة datetime-local ← ISO. فاضي = null */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const labelFormat = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

/** «السبت ١١ أكتوبر، ٢:٣٠ م» */
export const deliveryLabel = (iso: string) => labelFormat.format(new Date(iso));

/**
 * اللي المشتري اختاره في متجر (لنفسه) — بيتحفظ على الجهاز زي طريقة الاستلام، عشان
 * صفحة الفاتورة تبعته بنفس الميعاد. السلة الفاضية بتبدأ من «دلوقتي» تاني.
 */
const deliveryKey = (shopId: string) => `aswaq_delivery_${shopId}`;

export function rememberedDelivery(shopId: string): Delivery | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(deliveryKey(shopId)) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const { deliveryAt, deliveryNotes } = parsed as Partial<Delivery>;
    return { deliveryAt: typeof deliveryAt === 'string' ? deliveryAt : null, deliveryNotes: typeof deliveryNotes === 'string' ? deliveryNotes : '' };
  } catch {
    return null;
  }
}

export function rememberDelivery(shopId: string, delivery: Delivery | null) {
  try {
    if (delivery) localStorage.setItem(deliveryKey(shopId), JSON.stringify(delivery));
    else localStorage.removeItem(deliveryKey(shopId));
  } catch {
    // الجهاز رافض — الميعاد بيفضل في الصفحة وبس
  }
}
