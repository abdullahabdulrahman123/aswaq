import type { Order, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { WaslaAuthError } from '../middleware/auth.js';
import { isWriteConflict } from './ledger.service.js';

/**
 * الماليات (مكالمة ٧ أكتوبر) — المرحلة الأولى: الخزن (في وصلة، حساب فرعي لكل خزنة)
 * و«تحصيل» على فاتورة البيع. التحصيل معاملة مالية (financials) وحركة في الجدول الحاكم
 * (transactions) في عملية واحدة.
 */
export interface WaslaSafe {
  id: string;
  subAccountId: string;
  name: string;
  custodian: { accountId: string; name: string };
  /** بالقرش */
  openingBalance: number;
  creator: { accountId: string; name: string };
  createdAt: string;
  updatedAt: string;
}

const WASLA_TIMEOUT_MS = 60_000;

/** خزن النشاط من وصلة بتوكن المستخدم — وصلة بتتأكد إنه موظف فيه */
export async function fetchWaslaSafes(token: string, accountId: string): Promise<WaslaSafe[]> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${env.waslaApiOrigin}/api/businesses/${encodeURIComponent(accountId)}/safes`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(WASLA_TIMEOUT_MS),
    });
  } catch {
    throw new WaslaAuthError(503, 'Wasla unavailable');
  }
  if (res.status === 401) throw new WaslaAuthError(401, 'Invalid or expired token');
  if (res.status === 404) return [];
  if (!res.ok) throw new WaslaAuthError(502, 'Wasla error');
  return ((await res.json()) as { safes: WaslaSafe[] }).safes;
}

/** اللي اتحصّل على الفاتورة لحد دلوقتي، بالقرش */
async function paidOn(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
  const { _sum } = await tx.financial.aggregate({ where: { orderId, kind: 'receipt', state: 'done' }, _sum: { amount: true } });
  return _sum.amount ?? 0;
}

export function receiptsOf(orderId: string) {
  return prisma.financial.findMany({ where: { orderId, kind: 'receipt' }, orderBy: { createdAt: 'asc' } });
}

export const paidOf = (orderId: string) => paidOn(prisma, orderId);

/** المبلغ أكبر من اللي فاضل على الفاتورة — remaining بالقرش */
export class OverpaymentError extends Error {
  constructor(readonly remaining: number) {
    super('Amount is more than what is left on the invoice');
    this.name = 'OverpaymentError';
  }
}

/** الفاتورة اتلغت أو لسه مسودة في نفس اللحظة */
export class NotCollectableError extends Error {}

const RETRIES = 5;

/**
 * «تحصيل» (مكالمة ٧ أكتوبر): من العميل — حسابه الفرعي فاضي لحد ما يبقى طرف أصيل —
 * للنشاط في خزنة اللي بيحصّل. رقم الإيصال من عدّاد النشاط، والعدّاد بيتلمس في كل
 * تحصيل: تحصيلين في نفس اللحظة واحد فيهم بيتوقف ويتعاد، فالباقي ميتحسبش مرتين.
 */
export async function collect(order: Order, safe: WaslaSafe, amount: number, notes: string | null, creator: { acc: string; name: string }) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { seq } = await tx.counter.upsert({
          where: { id: `receipt:${order.from.acc}` },
          create: { id: `receipt:${order.from.acc}`, seq: 1 },
          update: { seq: { increment: 1 } },
        });
        const current = await tx.order.findUnique({ where: { id: order.id } });
        if (!current || current.state === 'draft' || current.state === 'cancelled') throw new NotCollectableError();
        const paid = await paidOn(tx, order.id);
        const remaining = current.netTotal - paid;
        if (amount > remaining) throw new OverpaymentError(remaining);

        const from = { acc: current.to.acc, subAcc: null };
        const to = { acc: current.from.acc, subAcc: safe.subAccountId };
        const receipt = await tx.financial.create({
          data: {
            number: seq,
            kind: 'receipt',
            state: 'done',
            accountId: current.from.acc,
            from,
            to,
            amount,
            orderId: current.id,
            invoiceNumber: current.number,
            names: { from: current.names.buyer, to: current.names.business, safe: safe.name },
            notes,
            creator,
          },
        });
        await tx.transaction.create({ data: { kind: 'receipt', from, to, amount, source: 'financial', ref: receipt.id, creator } });
        return { receipt, paid: paid + amount, remaining: remaining - amount };
      });
    } catch (err) {
      if (isWriteConflict(err) && attempt < RETRIES) continue;
      throw err;
    }
  }
}
