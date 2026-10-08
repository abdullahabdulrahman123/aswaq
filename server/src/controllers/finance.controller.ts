import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser, findManagedBusiness } from '../middleware/auth.js';
import { isObjectId } from '../schemas/common.js';
import { NotCollectableError, OverpaymentError, collect, fetchWaslaSafes, paidOf, receiptsOf } from '../services/finance.service.js';
import { movementOf } from '../services/ledger.service.js';
import { findById } from '../services/order.service.js';

/**
 * الماليات — المرحلة الأولى (مكالمة ٧ أكتوبر): رصيد الخزن، و«تحصيل» على فاتورة البيع.
 * الخزن نفسها بتتعمل وتتعدّل في وصلة (حساب فرعي لكل خزنة)، وأسواق بيضيف عليها رصيدها
 * من الجدول الحاكم.
 */

/**
 * GET /api/businesses/:accountId/safes — خزن النشاط ورصيد كل واحدة: الافتتاحي + اللي
 * دخلها − اللي طلع منها. mine = في عهدة المستخدم ده (التحصيل بيروح لها)
 */
export async function safes(req: Request, res: Response) {
  const me = await currentUser(req);
  const list = await fetchWaslaSafes(req.waslaToken!, req.business!.accountId);
  const moved = await movementOf(list.map((s) => s.subAccountId));
  res.json({
    safes: list.map((s) => ({ ...s, balance: s.openingBalance + (moved.get(s.subAccountId) ?? 0), mine: s.custodian.accountId === me.accountId })),
  });
}

/** فاتورة بيع مؤكدة للنشاط البائع — null = مش موجودة أو مش بتاعته (404) */
async function sellerOrder(req: Request) {
  const id = String(req.params.orderId);
  const order = isObjectId(id) ? await findById(id) : null;
  return order && order.state !== 'draft' && (await findManagedBusiness(req, order.from.acc)) ? order : null;
}

/** GET /api/orders/:orderId/receipts — اللي اتحصّل على الفاتورة واللي فاضل، للنشاط البائع */
export async function receipts(req: Request, res: Response) {
  const order = await sellerOrder(req);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  const list = await receiptsOf(order.id);
  const paid = await paidOf(order.id);
  res.json({ receipts: list, paid, remaining: order.netTotal - paid });
}

const receiptSchema = z.object({
  /** id الخزنة في وصلة */
  safeId: z.string().trim().min(1),
  /** بالقرش */
  amount: z.number().int().min(1).max(1_000_000_000_00),
  notes: z.string().trim().max(300).optional(),
});

/**
 * POST /api/orders/:orderId/receipts — «تحصيل» (مكالمة ٧ أكتوبر): إيصال استلام نقدية
 * من العميل لخزنة في عهدة اللي بيحصّل. 403 = الخزنة مش في عهدته، 409 = الفاتورة
 * اتلغت، 422 = المبلغ أكبر من الباقي (remaining في الرد).
 */
export async function collectReceipt(req: Request, res: Response) {
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const order = await sellerOrder(req);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  if (order.state === 'cancelled') {
    res.status(409).json({ message: 'Order is cancelled' });
    return;
  }
  const me = await currentUser(req);
  const safe = (await fetchWaslaSafes(req.waslaToken!, order.from.acc)).find((s) => s.id === parsed.data.safeId);
  if (!safe || safe.custodian.accountId !== me.accountId) {
    res.status(403).json({ message: 'This safe is not in your custody' });
    return;
  }
  try {
    const done = await collect(order, safe, parsed.data.amount, parsed.data.notes || null, { acc: me.accountId, name: me.name });
    res.status(201).json(done);
  } catch (err) {
    if (err instanceof OverpaymentError) {
      res.status(422).json({ message: err.message, remaining: err.remaining });
      return;
    }
    if (err instanceof NotCollectableError) {
      res.status(409).json({ message: 'Order is cancelled' });
      return;
    }
    throw err;
  }
}
