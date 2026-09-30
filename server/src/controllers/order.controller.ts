import type { Request, Response } from 'express';
import type { Order, Prisma } from '@prisma/client';
import { currentUser, fetchWaslaStore, findManagedBusiness } from '../middleware/auth.js';
import { isObjectId } from '../schemas/common.js';
import { announceIncoming } from '../realtime.js';
import { draftSchema, lineSchema } from '../schemas/order.schema.js';
import {
  buildDetails,
  checkOut,
  deleteOrder,
  findDraft,
  findById,
  findMine,
  listIncoming,
  listMine,
  nextNumber,
  priceFieldFor,
  replaceDetails,
  saveDraft,
  storeItems,
  totalsOf,
  withLine,
} from '../services/order.service.js';

/** الأوردر زي ما هو — كل حقول السكيمة، مفيش حاجة سرية على المحرّر نفسه */
const toOrderView = (order: Order) => order;

/**
 * PUT /api/orders/draft — المسودة كلها: الهيدر والسطور. بطلب العميل السلة
 * بتتحفظ مسودة (لأسباب تسويقية: البائع يقدر يكلّم اللي ما كمّلش)، والنداء ده
 * بيفتح المسودة مع أول صنف، وبيعيد تسعيرها لما الهيدر يتغيّر (طريقة الاستلام
 * أو مشتري البيعة)، وبيطابقها مع الجهاز لما الفاتورة تتفتح. الصنف الواحد بعد
 * كده بيتحفظ لوحده (putLine). مسودة واحدة لكل متجر ومشتري عند المحرّر.
 * سطور فاضية = المسودة تتمسح.
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
  // السعر اللي في السطر بيتاخد في «مبيعات» بس — البائع اتأكد فوق إنه بيدير النشاط
  const details = buildDetails(await storeItems(input.shopId), input.lines, priceFieldFor(Boolean(input.sale), buyerKind), Boolean(input.sale));
  if (typeof details === 'string') {
    res.status(400).json({ message: details });
    return;
  }

  const data: Prisma.OrderCreateInput = {
    state: 'draft',
    ref,
    creator: { acc: me.accountId, name: me.name },
    editor: { acc: me.accountId, name: me.name },
    seller,
    // الحساب الفرعي بتاع المتجر في وصلة — ووصلة القديمة من غيره: المقر نفسه
    from: { acc: store.business.accountId, subAcc: store.subAccountId ?? input.shopId },
    shopId: input.shopId,
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

/** كام مرة الصنف بيحاول تاني لو صنف تاني اتحفظ في نفس اللحظة */
const LINE_RETRIES = 5;

/**
 * PUT /api/orders/:orderId/lines — صنف واحد في مسودة، بطلب العميل: الحفظ
 * صنف صنف لما المشتري يدوس «تم»، والهيدر مبيتبعتش كل مرة. السعر بنوع
 * المشتري اللي في المسودة، وبأسعار المحل لو هي «مبيعات» — وفيها البائع يقدر
 * يكتب السعر بنفسه (price). الكمية صفر بتشيل الصنف، وآخر صنف
 * بيمسح المسودة ({ order: null }). 409 = المسودة اتأكدت، و404 = مش موجودة —
 * والواجهة ساعتها بتبعت المسودة كلها من الأول.
 */
export async function putLine(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const parsed = lineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const me = await currentUser(req);
  /** سعر البائع: في مسودة «مبيعات» بس، ولسه بيدير النشاط البائع */
  let pricedBySeller: boolean | null = null;

  for (let attempt = 0; attempt < LINE_RETRIES; attempt++) {
    const order = isObjectId(id) ? await findMine(me.accountId, id) : null;
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    if (order.state !== 'draft') {
      res.status(409).json({ message: 'Order is already checked out' });
      return;
    }

    const shopId = order.shopId ?? order.from.subAcc ?? '';
    const field = priceFieldFor(Boolean(order.sale), order.names.buyerKind as 'user' | 'business');
    if (pricedBySeller === null) {
      pricedBySeller = parsed.data.price !== undefined && order.sale != null && Boolean(await findManagedBusiness(req, order.from.acc));
    }
    const details = withLine(order.details, await storeItems(shopId), parsed.data, field, pricedBySeller);
    if (typeof details === 'string') {
      res.status(400).json({ message: details });
      return;
    }
    if (details.length === 0) {
      await deleteOrder(order.id);
      res.json({ order: null });
      return;
    }
    if (await replaceDetails(order, details, { acc: me.accountId, name: me.name })) {
      res.json({ order: toOrderView((await findMine(me.accountId, id))!) });
      return;
    }
  }
  res.status(409).json({ message: 'Order changed while saving, try again' });
}

export async function list(req: Request, res: Response) {
  const me = await currentUser(req);
  res.json({ orders: (await listMine(me.accountId)).map(toOrderView) });
}

/**
 * الأوردر لصاحبه (المحرّر) — وللنشاط البائع كمان لو اتأكد: «الطلبات الواردة»
 * بتفتح فاتورته. المسودة للمحرّر بس.
 */
export async function get(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const me = await currentUser(req);
  let order = isObjectId(id) ? await findMine(me.accountId, id) : null;
  if (!order && isObjectId(id)) {
    const sold = await findById(id);
    if (sold && sold.state !== 'draft' && (await findManagedBusiness(req, sold.from.acc))) order = sold;
  }
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
  // «الطلبات الواردة» عند النشاط البائع — لحظة بلحظة
  await announceIncoming(done).catch(() => undefined);
  res.json({ order: toOrderView(done) });
}

/**
 * GET /api/businesses/:accountId/incoming — «الطلبات الواردة»، بطلب العميل: الأوردرات
 * المؤكدة اللي النشاط ده بائعها (from.acc) ولسه مخلصتش. الاستعلام بسيط لحد
 * ما إدارة الحالات تتعمل («خليها تكويري بعبط»): كل اللي حالته order. المسودات
 * مش هنا — دي للتسويق وليها تقارير لوحدها.
 */
export async function incoming(req: Request, res: Response) {
  res.json({ orders: (await listIncoming(req.business!.accountId)).map(toOrderView) });
}
