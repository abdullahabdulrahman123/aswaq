import { Prisma, type BusinessMetric, type Order } from '@prisma/client';
import { prisma } from '../config/db.js';
import { CLOSED_STATES } from './orderFlow.js';

/**
 * مؤشرات البيع (مكالمة ٦ أكتوبر، «بيزنس ميتريكس») — صف لكل نشاط في كل يوم بتوقيت
 * مصر في business_metrics. بيتحدّث مع كل حركة في الأوردرات (التأكيد، المرحلة اللي
 * بعدها، «إتمام»، الإلغاء، وتعديل فاتورة مؤكدة)، ولما الصفحة تتفتح.
 *
 * الخانات بتتحسب من الأوردرات نفسها مش بالجمع على اللي فات: الفاتورة بتتنقل من
 * «مستقبلية» لـ«في الطريق» لـ«محققة» من غير ما تتحسب مرتين، والإلغاء وتعديل
 * الكميات بيظبطوا الرقم لوحدهم. اللي العميل وصفه («القيمة اللي موجودة زائد الجديد»)
 * بيطلع نفس الرقم، بس اللي بيتحسب من الأوردرات مبيبعدش عنها لو حركة فاتت.
 */

const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** اليوم بتوقيت مصر — 2026-10-06 */
export const cairoDay = (at: Date) => DAY.format(at);

type Buckets = { achieved: number; inProcess: number; future: number };
type Premises = Buckets & { premisesId: string; name: string };

const empty = (): Buckets => ({ achieved: 0, inProcess: 0, future: 0 });

/** الخانة اللي الأوردر فيها دلوقتي — null = مسودة أو ملغية أو اتمت يوم تاني */
function bucketOf(order: Pick<Order, 'state' | 'completedAt'>, today: string): keyof Buckets | null {
  if (order.state === 'order') return 'future';
  if (!CLOSED_STATES.includes(order.state)) return 'inProcess';
  if (order.state === 'done' && order.completedAt && cairoDay(order.completedAt) === today) return 'achieved';
  return null;
}

/** صف النهارده للنشاط ده من الأوردرات — بيتحفظ ويرجع */
export async function refreshMetrics(accountId: string, now = new Date()): Promise<BusinessMetric> {
  const today = cairoDay(now);
  const orders = await prisma.order.findMany({
    where: {
      from: { is: { acc: accountId } },
      OR: [
        { state: { notIn: CLOSED_STATES } },
        // «إتمام» النهارده — يومين لورا كفاية لأي فرق في التوقيت
        { state: 'done', completedAt: { gte: new Date(now.getTime() - 2 * 86_400_000) } },
      ],
    },
    select: { state: true, completedAt: true, netTotal: true, shopId: true, from: true, names: true, checkedOutAt: true },
    orderBy: { checkedOutAt: 'asc' },
  });

  const total = empty();
  const premises = new Map<string, Premises>();
  for (const order of orders) {
    const bucket = bucketOf(order, today);
    if (!bucket) continue;
    total[bucket] += order.netTotal;
    const premisesId = order.shopId ?? order.from.subAcc;
    if (!premisesId) continue;
    const row = premises.get(premisesId) ?? { premisesId, name: order.names.store, ...empty() };
    // اسم المقر من آخر أوردر منه — لو اتغيّر اسمه في وصلة
    row.name = order.names.store;
    row[bucket] += order.netTotal;
    premises.set(premisesId, row);
  }

  const data = { ...total, premises: [...premises.values()] };
  const where = { accountId_date: { accountId, date: today } };
  try {
    return await prisma.businessMetric.upsert({ where, create: { accountId, date: today, ...data }, update: data });
  } catch (err) {
    // حركتين في نفس اللحظة وأول صف في اليوم: التانية بتلاقيه اتعمل، فبتحدّثه
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return prisma.businessMetric.update({ where, data });
    }
    throw err;
  }
}

/** بعد حركة في أوردر — غلط في المؤشرات ميوقعش الحركة نفسها */
export async function afterOrderChange(accountId: string): Promise<void> {
  await refreshMetrics(accountId).catch((err) => console.error('metrics refresh failed', accountId, err));
}
