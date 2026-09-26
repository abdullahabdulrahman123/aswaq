import type { Request, Response } from 'express';
import type { Order, Prisma } from '@prisma/client';
import { currentUser, fetchWaslaStore, findManagedBusiness } from '../middleware/auth.js';
import { isObjectId } from '../schemas/common.js';
import { draftSchema } from '../schemas/order.schema.js';
import {
  buildDetails,
  checkOut,
  deleteOrder,
  findDraft,
  findMine,
  listMine,
  nextNumber,
  priceFieldFor,
  saveDraft,
  storeItems,
  totalsOf,
} from '../services/order.service.js';

/** الأوردر زي ما هو — كل حقول السكيمة، مفيش حاجة سرية على المحرّر نفسه */
const toOrderView = (order: Order) => order;

/**
 * PUT /api/orders/draft — السلة بتتحفظ مسودة مع كل تغيير، بطلب العميل (لأسباب
 * تسويقية: البائع يقدر يكلّم اللي ما كمّلش). مسودة واحدة لكل متجر ومشتري عند
 * المحرّر. سطور فاضية = المسودة تتمسح.
 */
export async function putDraft(req: Request, res: Response) {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const input = parsed.data;
  const me = await currentUser(req);
  const ref = `${input.sale?.id ?? 'me'}:${input.shopId}`;
  const existing = await findDraft(me.accountId, ref);

  if (input.lines.length === 0) {
    if (existing) await deleteOrder(existing.id);
    res.json({ order: null });
    return;
  }

  const store = await fetchWaslaStore(input.shopId);
  if (!store) {
    res.status(404).json({ message: 'Store not found' });
    return;
  }

  // المشتري: في البيعة البائع لازم يدير النشاط اللي بيبيع منه. لنفسه: حسابه أو نشاط بيديره
  let to: string;
  let buyerKind: 'user' | 'business';
  let buyerName: string;
  let buyerPhone = '';
  let seller = { acc: me.accountId, name: me.name };
  if (input.sale) {
    if (input.sale.accountId !== store.business.accountId || !(await findManagedBusiness(req, store.business.accountId))) {
      res.status(404).json({ message: 'Store not found in this business' });
      return;
    }
    to = input.sale.buyer.accountId;
    buyerKind = input.sale.buyer.kind;
    buyerName = input.sale.buyerName || input.sale.buyer.name;
    buyerPhone = input.sale.phone;
    seller = { acc: me.accountId, name: input.sale.sellerName || me.name };
  } else {
    to = input.to ?? me.accountId;
    const business = to === me.accountId ? undefined : await findManagedBusiness(req, to);
    if (to !== me.accountId && !business) {
      res.status(404).json({ message: 'Buyer account not found' });
      return;
    }
    buyerKind = business ? 'business' : 'user';
    buyerName = business?.name ?? me.name;
  }

  const method = input.sale?.method ?? input.method;
  const details = buildDetails(await storeItems(input.shopId), input.lines, priceFieldFor(method, buyerKind));
  if (typeof details === 'string') {
    res.status(400).json({ message: details });
    return;
  }

  const data: Prisma.OrderCreateInput = {
    state: 'draft',
    ref,
    creator: { acc: me.accountId, name: me.name },
    seller,
    from: { acc: store.business.accountId, subAcc: input.shopId },
    to: { acc: to, subAcc: null },
    names: { business: store.business.name, store: store.name, buyer: buyerName, buyerPhone, buyerKind },
    method,
    address: method === 'delivery' ? (input.sale?.address ?? '') : '',
    sale: input.sale ? (input.sale as Prisma.InputJsonValue) : undefined,
    ...totalsOf(details),
    details,
  };
  const order = await saveDraft(existing?.id ?? null, data);
  res.json({ order: toOrderView(order) });
}

export async function list(req: Request, res: Response) {
  const me = await currentUser(req);
  res.json({ orders: (await listMine(me.accountId)).map(toOrderView) });
}

export async function get(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const me = await currentUser(req);
  const order = isObjectId(id) ? await findMine(me.accountId, id) : null;
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  res.json({ order: toOrderView(order) });
}

/** POST /api/orders/:orderId/checkout — المسودة بتبقى أوردر برقم فاتورة من عدّاد النشاط البائع */
export async function checkout(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const me = await currentUser(req);
  const order = isObjectId(id) ? await findMine(me.accountId, id) : null;
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  if (order.state !== 'draft') {
    res.status(409).json({ message: 'Order is already checked out' });
    return;
  }
  if (order.details.some((d) => d.unpriced)) {
    res.status(422).json({ message: 'Some units have no price yet' });
    return;
  }
  const done = await checkOut(order.id, await nextNumber(order.from.acc));
  res.json({ order: toOrderView(done) });
}
