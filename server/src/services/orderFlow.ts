import type { Order, OrderAmount } from '@prisma/client';
import { prisma } from '../config/db.js';

/**
 * مراحل الأوردر — مكالمة ١ أكتوبر: زرار واحد («تأكيد») بينقل الأوردر مرحلة
 * مرحلة واسمه بيتغيّر، وآخرها «إتمام».
 *
 * مكالمة ٢ أكتوبر: المراحل اللي في النص كل نشاط بيختارها من قالب عام ويرتّبها
 * (إعدادات النشاط، BusinessSettings) — «أنا مش هحط states من عندي… صاحب البيزنس
 * هو اللي يحدد». المشتري بيشوف اسم المرحلة على طلبه عشان يتابعه.
 *
 *   draft ← (checkout، رقم الفاتورة) ← order ← [مراحل النشاط] ← done
 *
 * الثابت: المسودة والمؤكد في الأول والمكتمل في الآخر. والزرار بيقول المرحلة
 * اللي جاية (action)، واسم المرحلة اللي الأوردر فيها بيتكتب (label).
 */
export interface StageTemplate {
  key: string;
  /** اسم المرحلة اللي الأوردر فيها — المشتري بيشوفه */
  label: string;
  /** الزرار اللي بينقل الأوردر للمرحلة دي */
  action: string;
}

/** القالب العام — كل نشاط بياخد منه. بيزيد هنا لما نحتاج مرحلة جديدة */
export const STAGE_TEMPLATE: StageTemplate[] = [
  { key: 'preparing', label: 'بيتجهّز', action: 'تجهيز' },
  { key: 'packing', label: 'بيتغلّف', action: 'تغليف' },
  { key: 'loading', label: 'بيتحمّل', action: 'تحميل' },
  { key: 'on_the_way', label: 'في الطريق', action: 'توصيل' },
  { key: 'delivered', label: 'اتسلّم', action: 'تسليم' },
];

const FIXED: Record<string, StageTemplate> = {
  draft: { key: 'draft', label: 'مسودة', action: '' },
  order: { key: 'order', label: 'مؤكد', action: 'تأكيد' },
  done: { key: 'done', label: 'مكتمل', action: 'إتمام' },
  // مكالمة ٥ أكتوبر: من أي مرحلة مفتوحة، بزرار لوحده مش زرار المرحلة
  cancelled: { key: 'cancelled', label: 'ملغية', action: 'إلغاء' },
};

const byKey = new Map([...STAGE_TEMPLATE, ...Object.values(FIXED)].map((s) => [s.key, s]));

/**
 * ألوان المراحل (رسالة العميل ٦ أكتوبر): «هوية بصرية للحالة… بس يديني شرط وانا بختار
 * الالوان ميبقاش لونين زي بعض». مفاتيح بس — شكل كل لون في الواجهة (lib/stageColors).
 * مؤكد ومكتمل وملغية ثابتين، والمراحل اللي في النص صاحب الشركة بيختار لها من الباقي.
 */
export const FIXED_COLORS: Record<string, string> = { draft: 'gray', order: 'blue', done: 'green', cancelled: 'red' };
export const STAGE_COLOR_CHOICES = ['amber', 'violet', 'orange', 'teal', 'pink', 'lime', 'brown'];
const DEFAULT_STAGE_COLORS: Record<string, string> = { preparing: 'amber', packing: 'violet', loading: 'orange', on_the_way: 'teal', delivered: 'pink' };

/** لون كل مرحلة في القالب: اللي صاحب الشركة اختاره، وإلا الافتراضي */
export function stageColorsOf(saved: unknown): Record<string, string> {
  const chosen = saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  return Object.fromEntries(
    STAGE_TEMPLATE.map((s) => {
      const color = chosen[s.key];
      return [s.key, typeof color === 'string' && STAGE_COLOR_CHOICES.includes(color) ? color : DEFAULT_STAGE_COLORS[s.key]];
    }),
  );
}

const colorOf = (state: string, colors: Record<string, string>) => FIXED_COLORS[state] ?? colors[state] ?? 'gray';

/** المسودة والمكتمل والملغية — كل اللي بينهم مفتوح («مهامي») */
export const CLOSED_STATES = ['draft', 'done', 'cancelled'];

/** خلصت (مكتملة أو ملغية) — مبتتعدّلش ومبتتنقلش */
export const isFinished = (state: string) => state === 'done' || state === 'cancelled';

/** مراحل النشاط كاملة بالترتيب، من المسودة للمكتمل */
export function flowOf(salesStages: string[]): string[] {
  return ['draft', 'order', ...salesStages.filter((k) => STAGE_TEMPLATE.some((s) => s.key === k)), 'done'];
}

/**
 * المرحلة اللي بعد دي — null = آخر مرحلة. مرحلة صاحب الشركة شالها من إعداداته
 * والأوردر لسه فيها: اللي بعدها مكتمل.
 */
export function nextIn(flow: string[], state: string): string | null {
  if (isFinished(state)) return null;
  const i = flow.indexOf(state);
  return i >= 0 ? flow[i + 1] ?? null : 'done';
}

/**
 * المراحل اللي الطلب يقدر يرجعلها بـ«تراجع» (مكالمة العميل ٩ أكتوبر: «يفتحلي دايلوج صغير إن أنا أرجعه لحالة سابقة
 * في الستيج اللي هو فيها» — الميزان طلّع غلط في العدد فيرجع للمراجعة): جوه مراحل الطلب بس، من «مؤكد» لحد اللي قبل
 * مرحلته. الفاتورة لأ (تصحيحها «مردود بيع»)، ولا المسودة (دي حالة تانية). مرحلة اتشالت من الإعدادات والطلب
 * لسه فيها: يرجع لأي مرحلة مفتوحة
 */
export function backStatesOf(flow: string[], order: Pick<Order, 'state' | 'kind'>): string[] {
  if (order.kind === 'invoice' || order.state === 'draft' || isFinished(order.state)) return [];
  const at = flow.indexOf(order.state);
  return at < 0 ? flow.slice(1, -1) : flow.slice(1, at);
}

export function labelOf(state: string): string {
  return byKey.get(state)?.label ?? state;
}

/** مراحل البيع اللي النشاط ده اختارها — فاضي = مؤكد ← مكتمل */
export async function salesStagesOf(businessId: string): Promise<string[]> {
  const row = await prisma.businessSettings.findUnique({ where: { businessId } });
  return row?.salesStages ?? [];
}

/**
 * الطلب بيبقى فاتورة مع المرحلة دي (رسالة العميل ٨ أكتوبر: «إعداد إمتى تبقى فاتورة»): اللي
 * صاحب الشركة اختارها لو لسه من مراحله، وإلا «تسليم» لو مفعّلة، وإلا «إتمام»
 */
export function invoiceStageOf(salesStages: string[], chosen: string | null | undefined): string {
  if (chosen && (chosen === 'done' || salesStages.includes(chosen))) return chosen;
  return salesStages.includes('delivered') ? 'delivered' : 'done';
}

/** المرحلة دي وصلت مرحلة الفاتورة أو عدّتها؟ الملغية لأ */
export function reachesInvoice(flow: string[], state: string, invoiceStage: string): boolean {
  if (state === 'cancelled') return false;
  const at = flow.indexOf(state);
  return state === 'done' || (at >= 0 && at >= flow.indexOf(invoiceStage));
}

/**
 * حالات عملية البيع (مكالمة ٨ أكتوبر: «دول التلات حالات… مفيش حالة خارجهم») — كل حالة
 * ليها مسلسل لوحدها عند النشاط البائع. بتتكتب في جدول order_kinds ساعة ما السيرفر يقوم
 */
export const ORDER_KINDS = [
  { key: 'draft', name: 'مسودة', sort: 1, description: 'لسه بيختار الأصناف — رقمها من مسلسل المسودات من أول ما تتعمل' },
  { key: 'order', name: 'طلب', sort: 2, description: 'بعد «تأكيد» — رقمه من مسلسل الطلبات، وبيتعدّل ويتلغي' },
  {
    key: 'invoice',
    name: 'فاتورة',
    sort: 3,
    description: 'مع المرحلة اللي النشاط اختارها («الطلب يبقى فاتورة مع») — رقمها من مسلسل الفواتير المتصل، وبتدخل الحسابات ومبتتعدّلش ولا بتتلغي',
  },
] as const;

/** جدول الحالات زي ORDER_KINDS — بيضيف اللي ناقص ويحدّث الاسم والوصف */
export async function syncOrderKinds() {
  for (const kind of ORDER_KINDS) {
    await prisma.orderKind.upsert({ where: { key: kind.key }, create: { ...kind }, update: { name: kind.name, sort: kind.sort, description: kind.description } });
  }
}

/** مراحل النشاط ومرحلة الفاتورة عنده */
export async function salesFlowOf(businessId: string): Promise<{ flow: string[]; invoiceStage: string }> {
  const row = await prisma.businessSettings.findUnique({ where: { businessId } });
  const stages = row?.salesStages ?? [];
  return { flow: flowOf(stages), invoiceStage: invoiceStageOf(stages, row?.invoiceStage) };
}

export type OrderView = Order & {
  /** اسم المرحلة — للمشتري والبائع */
  stateLabel: string;
  /** زرار المرحلة اللي بعدها، للبائع. فاضي = آخر مرحلة */
  nextAction: string | null;
  /** لون المرحلة — مفتاح من FIXED_COLORS أو STAGE_COLOR_CHOICES */
  stateColor: string;
  /** المراحل اللي «تراجع» يرجّعه لها، الأقدم الأول (backStatesOf). فاضي = مفيش تراجع */
  backTo: { state: string; label: string }[];
};

/**
 * الأوردرات زي ما الواجهة بتعرضها: اسم المرحلة وزرار اللي بعدها حسب مراحل
 * النشاط البائع. استعلام واحد لإعدادات كل الأنشطة البائعة اللي في الليستة.
 */
export async function withFlow(orders: Order[]): Promise<OrderView[]> {
  const sellers = [...new Set(orders.map((o) => o.from.acc))];
  const rows = sellers.length ? await prisma.businessSettings.findMany({ where: { businessId: { in: sellers } } }) : [];
  const flows = new Map(rows.map((r) => [r.businessId, flowOf(r.salesStages)]));
  const colors = new Map(rows.map((r) => [r.businessId, stageColorsOf(r.stageColors)]));
  return orders.map((order) => {
    const flow = flows.get(order.from.acc) ?? flowOf([]);
    const next = nextIn(flow, order.state);
    return {
      ...order,
      stateLabel: labelOf(order.state),
      nextAction: next ? labelOfAction(next) : null,
      stateColor: colorOf(order.state, colors.get(order.from.acc) ?? stageColorsOf(null)),
      backTo: backStatesOf(flow, order).map((state) => ({ state, label: labelOf(state) })),
    };
  });
}

function labelOfAction(state: string): string {
  return byKey.get(state)?.action ?? state;
}

export async function viewOf(order: Order): Promise<OrderView> {
  return (await withFlow([order]))[0];
}

const withoutAvg = ({ avg: _avg, ...amount }: OrderAmount) => amount;

/**
 * الأوردر زي ما المشتري بيشوفه: من غير تكلفة البائع (avg) ولا مكسبه (فحص ٦
 * أكتوبر — كانوا بيوصلوا في رد السيرفر من غير ما يظهروا في الشاشة). البائع
 * بس اللي بيشوفهم — shownTo في order.controller.
 */
export function withoutCost(view: OrderView) {
  const { totalAvg: _totalAvg, totalProfit: _totalProfit, ...rest } = view;
  return {
    ...rest,
    details: view.details.map(({ avg: _avg, profit: _profit, demanded, deviation, ...detail }) => ({
      ...detail,
      demanded: withoutAvg(demanded),
      deviation: withoutAvg(deviation),
    })),
  };
}
