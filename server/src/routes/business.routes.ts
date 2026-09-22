import { Router } from 'express';
import { requireBusinessAccess } from '../middleware/auth.js';
import * as itemController from '../controllers/item.controller.js';
import * as storeController from '../controllers/store.controller.js';

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
scoped.delete('/items/:itemId', itemController.remove);

scoped.get('/shops/:shopId/items', itemController.listInStore);
scoped.get('/shops/:shopId/items/available', itemController.listAvailableForStore);
scoped.post('/shops/:shopId/items', itemController.addToStore);

scoped.get('/shops/settings', storeController.listSettings);
scoped.put('/shops/:shopId/settings', storeController.updateSettings);

const router = Router();
router.use('/:accountId', scoped);

export default router;
