import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { currentUser, fetchWaslaStore, findManagedBusiness } from '../middleware/auth.js';
import { isObjectId } from '../schemas/common.js';
import { announceIncoming, announceState } from '../realtime.js';
import { draftSchema, lineSchema } from '../schemas/order.schema.js';
import { flowOf, nextIn, salesStagesOf, viewOf, withFlow } from '../services/orderFlow.js';
import { PERMISSIONS, can } from '../services/permissions.js';
import {
  advanceState,
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
  replaceConfirmedDetails,
  replaceDetails,
  saveDraft,
  storeItems,
  totalsOf,
  withConfirmedLine,
  withLine,
} from '../services/order.service.js';

/*
 * الأوردر زي ما هو — كل حقول السكيمة، مفيش حاجة سرية على المحرّر نفسه — ومعاه
 * اسم مرحلته وزرار اللي بعدها حسب مراحل النشاط البائع (viewOf / withFlow).
 */

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
  /** «مبيعات»: السعر اللي البائع كتبه بيتاخد لو معاه الصلاحية — من غيرها سعر المتجر */
  let pricedBySeller = false;
  if (input.sale) {
    const selling = input.sale.accountId === store.business.accountId ? await findManagedBusiness(req, store.business.accountId) : undefined;
    if (!selling) {
      res.status(404).json({ message: 'Store not found in this business' });
      return;
    }
    pricedBySeller = can(selling, PERMISSIONS.invoicePrice);
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
  // السعر اللي في السطر بيتاخد في «مبيعات» بس، وبصلاحية «تغيير سعر صنف في فاتورة البيع» (٢ أكتوبر)
  const details = buildDetails(await storeItems(input.shopId), input.lines, priceFieldFor(Boolean(input.sale), buyerKind), pricedBySeller);
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
    // «مبيعات» = الشباك، والمشتري من المعرض = أونلاين
    source: input.sale ? 'onsite' : 'online',
    ...totalsOf(details),
    details,
  };
  const order = await saveDraft(existing?.id ?? null, data);
  if (!order) {
    res.status(409).json({ message: 'Order already checked out' });
    return;
  }
  res.json({ order: await viewOf(order) });
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
  /** سعر البائع: في مسودة «مبيعات» بس، ولسه بيدير النشاط البائع ومعاه الصلاحية */
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
      pricedBySeller = parsed.data.price !== undefined && order.sale != null && can(await findManagedBusiness(req, order.from.acc), PERMISSIONS.invoicePrice);
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
      res.json({ order: await viewOf((await findMine(me.accountId, id))!) });
      return;
    }
  }
  res.status(409).json({ message: 'Order changed while saving, try again' });
}

/**
 * PUT /api/orders/:orderId/confirmed-lines — صنف واحد في فاتورة اتأكدت ولسه
 * مخلصتش، بطلب العميل (مكالمة ٢ أكتوبر): بالصلاحيات، للنشاط البائع.
 *   - كمية صنف موجود (أو شيله بصفر): «تغيير كمية صنف في فاتورة البيع»
 *   - صنف مكانش فيها: «إضافة صنف مش موجود في فاتورة البيع»
 *   - سعر غير اللي اتباع بيه: «تغيير سعر صنف في فاتورة البيع»
 * 403 = الصلاحية مش معاه (والرد فيه اسمها)، و409 = المسودة لسه متأكدتش أو
 * الفاتورة خلصت. مسار لوحده عن /lines بتاع المسودة: حفظ متأخر من سلة المسودة
 * ميعدّلش فاتورة اتأكدت أبداً.
 */
export async function putConfirmedLine(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const parsed = lineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
    return;
  }
  const line = parsed.data;
  const me = await currentUser(req);

  for (let attempt = 0; attempt < LINE_RETRIES; attempt++) {
    const order = isObjectId(id) ? await findById(id) : null;
    const seller = order && order.state !== 'draft' ? await findManagedBusiness(req, order.from.acc) : undefined;
    if (!order || !seller) {
      res.status(order?.state === 'draft' ? 409 : 404).json({ message: order?.state === 'draft' ? 'Order is not confirmed yet' : 'Order not found' });
      return;
    }
    if (order.state === 'done') {
      res.status(409).json({ message: 'Order is already completed' });
      return;
    }

    const current = order.details.find((d) => d.itemId === line.itemId && d.unit === line.unitName);
    const needed = [
      current ? (line.quantity !== current.quantity ? PERMISSIONS.invoiceQuantity : null) : line.quantity > 0 ? PERMISSIONS.invoiceAddItem : null,
      line.price !== undefined && line.price !== (current?.price ?? null) && (current || line.quantity > 0) ? PERMISSIONS.invoicePrice : null,
    ].filter((k): k is NonNullable<typeof k> => k !== null);
    const missing = needed.find((key) => !can(seller, key));
    if (missing) {
      res.status(403).json({ message: 'Permission required', permission: missing });
      return;
    }

    const shopId = order.shopId ?? order.from.subAcc ?? '';
    const field = priceFieldFor(Boolean(order.sale), order.names.buyerKind as 'user' | 'business');
    const details = withConfirmedLine(order.details, await storeItems(shopId), line, field, line.price);
    if (typeof details === 'string') {
      res.status(400).json({ message: details });
      return;
    }
    if (details.length === 0) {
      res.status(422).json({ message: 'A confirmed invoice keeps at least one item' });
      return;
    }
    if (await replaceConfirmedDetails(order, details, { acc: me.accountId, name: me.name })) {
      const view = await viewOf((await findById(id))!);
      // «مهامي» عند الباقيين بالإجمالي الجديد
      await announceState(view).catch(() => undefined);
      res.json({ order: view });
      return;
    }
  }
  res.status(409).json({ message: 'Order changed while saving, try again' });
}

export async function list(req: Request, res: Response) {
  const me = await currentUser(req);
  res.json({ orders: await withFlow(await listMine(me.accountId)) });
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
  res.json({ order: await viewOf(order) });
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
  const done = await viewOf(await checkOut(order.id, await nextNumber(order.from.acc)));
  // «الطلبات الواردة» عند النشاط البائع — لحظة بلحظة
  await announceIncoming(done).catch(() => undefined);
  res.json({ order: done });
}

/**
 * POST /api/orders/:orderId/advance — المرحلة اللي بعدها، بطلب العميل (١ أكتوبر):
 * مؤكد ← [مراحل النشاط من إعداداته، ٢ أكتوبر] ← مكتمل («إتمام»). للنشاط البائع
 * بس — المشتري مبيقفلش طلب البائع. المسودة بتتأكد بـcheckout مش من هنا (رقم
 * الفاتورة). 409 = اتنقل من مكان تاني أو آخر مرحلة.
 */
export async function advance(req: Request, res: Response) {
  const id = String(req.params.orderId);
  const order = isObjectId(id) ? await findById(id) : null;
  if (!order || order.state === 'draft' || !(await findManagedBusiness(req, order.from.acc))) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  const to = nextIn(flowOf(await salesStagesOf(order.from.acc)), order.state);
  const moved = to ? await advanceState(order, to) : null;
  if (!moved) {
    res.status(409).json({ message: 'Order already moved on' });
    return;
  }
  const view = await viewOf(moved);
  // «مهامي» عند الباقيين بتتحدّث — المكتمل بيخرج منها
  await announceState(view).catch(() => undefined);
  res.json({ order: view });
}

/**
 * GET /api/businesses/:accountId/incoming — «الطلبات الواردة»، بطلب العميل: الأوردرات
 * المؤكدة اللي النشاط ده بائعها (from.acc) ولسه مخلصتش. الاستعلام بسيط لحد
 * ما إدارة الحالات تتعمل («خليها تكويري بعبط»): كل اللي حالته order. المسودات
 * مش هنا — دي للتسويق وليها تقارير لوحدها.
 */
export async function incoming(req: Request, res: Response) {
  res.json({ orders: await withFlow(await listIncoming(req.business!.accountId)) });
}
