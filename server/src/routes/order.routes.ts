import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';

/**
 * أوردرات المستخدم (هو المحرّر) — لنفسه أو في «مبيعات». مش تحت نشاط، لأن
 * المستخدم ممكن يشتري لنفسه من غير نشاط خالص. التوكن بيتفحص في app.ts.
 */
const router = Router();

router.get('/', orderController.list);
router.put('/draft', orderController.putDraft);
router.get('/:orderId', orderController.get);
router.post('/:orderId/checkout', orderController.checkout);

export default router;
