import { Router } from 'express';
import { requireBusinessAccess } from '../middleware/auth.js';
import * as itemController from '../controllers/item.controller.js';
import * as storeController from '../controllers/store.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as settingsController from '../controllers/settings.controller.js';
import * as metricsController from '../controllers/metrics.controller.js';
import * as financeController from '../controllers/finance.controller.js';

/**
 * كل حاجة في أسواق تبع نشاط تجاري، فكل المسارات تحت /api/businesses/:accountId.
 * mergeParams عشان :accountId يوصل لكل اللي جوه.
 *
 * :shopId هو id مقر في وصلة معلّم عليه «متجر» — مفيش جدول محلات هنا.
 */
const scoped = Router({ mergeParams: true });

scoped.use(requireBusinessAccess);

scoped.get('/items', itemController.list);
scoped.post('/items', itemController.create);
scoped.get('/items/:itemId', itemController.get);
scoped.put('/items/:itemId', itemController.update);
scoped.put('/items/:itemId/visibility', itemController.setVisibility);
scoped.delete('/items/:itemId', itemController.remove);

scoped.get('/shops/:shopId/items', itemController.listInStore);
scoped.get('/shops/:shopId/items/available', itemController.listAvailableForStore);
scoped.post('/shops/:shopId/items', itemController.addToStore);

scoped.get('/shops/settings', storeController.listSettings);
scoped.get('/incoming', orderController.incoming);
scoped.get('/metrics', metricsController.get);
// الخزن ورصيدها (مكالمة ٧ أكتوبر) — الخزن نفسها في وصلة
scoped.get('/safes', financeController.safes);
scoped.post('/safes', financeController.addSafe);
scoped.post('/safes/:safeId/opening', financeController.recordSafeOpening);
scoped.get('/settings', settingsController.get);
scoped.put('/settings', settingsController.update);
scoped.put('/shops/:shopId/settings', storeController.updateSettings);

const router = Router();
router.use('/:accountId', scoped);

export default router;
