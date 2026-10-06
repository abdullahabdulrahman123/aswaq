import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';

/**
 * أوردرات المستخدم (هو المحرّر) — لنفسه أو في «مبيعات». مش تحت نشاط، لأن
 * المستخدم ممكن يشتري لنفسه من غير نشاط خالص. التوكن بيتفحص في app.ts.
 */
const router = Router();

router.get('/', orderController.list);
router.get('/purchases', orderController.purchases);
router.put('/draft', orderController.putDraft);
router.put('/:orderId/lines', orderController.putLine);
router.put('/:orderId/confirmed-lines', orderController.putConfirmedLine);
router.put('/:orderId/header', orderController.putHeader);
router.get('/:orderId', orderController.get);
router.post('/:orderId/checkout', orderController.checkout);
router.post('/:orderId/advance', orderController.advance);
router.post('/:orderId/cancel', orderController.cancel);

export default router;
