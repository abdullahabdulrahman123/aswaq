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

/** وصلة رفضت الخزنة — status زي ما هو: 400 (المسؤول مش موظف، الاسم فاضي)، 403 (مش صاحب الشركة) */
export class WaslaSafeError extends Error {
  constructor(readonly status: number) {
    super('Wasla refused the safe');
    this.name = 'WaslaSafeError';
  }
}

/** خزنة جديدة في وصلة بتوكن المستخدم — حسابها الفرعي بيتعمل معاها */
export async function createWaslaSafe(token: string, accountId: string, input: { name: string; custodianId: string; openingBalance: number }): Promise<WaslaSafe> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${env.waslaApiOrigin}/api/businesses/${encodeURIComponent(accountId)}/safes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(WASLA_TIMEOUT_MS),
    });
  } catch {
    throw new WaslaAuthError(503, 'Wasla unavailable');
  }
  if (res.status === 401) throw new WaslaAuthError(401, 'Invalid or expired token');
  if (!res.ok) throw new WaslaSafeError(res.status);
  return ((await res.json()) as { safe: WaslaSafe }).safe;
}

/** الخزن اللي رصيد أول المدة بتاعها اتسجّل حركة (حساباتها الفرعية) */
export async function openingsOf(subAccs: string[]): Promise<Set<string>> {
  if (!subAccs.length) return new Set();
  const rows = await prisma.financial.findMany({ where: { kind: 'opening', to: { is: { subAcc: { in: subAccs } } } }, select: { to: true } });
  return new Set(rows.flatMap((r) => (r.to.subAcc ? [r.to.subAcc] : [])));
}

/** رصيد أول المدة اتسجّل للخزنة دي قبل كده — «مع أول حفظ هيتقفل» */
export class OpeningExistsError extends Error {}

/**
 * رصيد أول المدة (مكالمة ٨ أكتوبر): «لازم يكون حركة» — في financials وبعدين حركة مؤكدة في
 * الجدول الحاكم، في عملية واحدة. «فروم نال ونال… الى الأكاونت البزنس والصاب أكاونت الخزنة»،
 * ودي الحركة الوحيدة اللي من غير «من». مرة واحدة لكل خزنة: عدّاد النشاط بيتلمس، فتسجيلين
 * في نفس اللحظة واحد بس بيعدّي.
 */
export async function recordOpening(accountId: string, businessName: string, safe: WaslaSafe, creator: { acc: string; name: string }) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.counter.upsert({
          where: { id: `opening:${accountId}` },
          create: { id: `opening:${accountId}`, seq: 1 },
          update: { seq: { increment: 1 } },
        });
        if (await tx.financial.findFirst({ where: { kind: 'opening', to: { is: { subAcc: safe.subAccountId } } }, select: { id: true } })) {
          throw new OpeningExistsError();
        }
        const from = { acc: null, subAcc: null };
        const to = { acc: accountId, subAcc: safe.subAccountId };
        const opening = await tx.financial.create({
          data: {
            number: null,
            kind: 'opening',
            state: 'done',
            accountId,
            from,
            to,
            amount: safe.openingBalance,
            names: { from: '', to: businessName, safe: safe.name },
            creator,
          },
        });
        await tx.transaction.create({ data: { kind: 'opening', from, to, amount: safe.openingBalance, source: 'financial', ref: opening.id, creator } });
        return opening;
      });
    } catch (err) {
      if (isWriteConflict(err) && attempt < RETRIES) continue;
      throw err;
    }
  }
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
            orderNumber: current.number,
            invoiceNumber: current.invoiceNumber ?? null,
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
