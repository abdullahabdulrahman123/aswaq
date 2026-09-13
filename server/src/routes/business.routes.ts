import { Router } from 'express';
import { requireBusinessAccess } from '../middleware/auth.js';
import * as itemController from '../controllers/item.controller.js';
import * as shopController from '../controllers/shop.controller.js';

/**
 * كل حاجة في أسواق تبع نشاط تجاري، فكل المسارات تحت /api/businesses/:accountId.
 * mergeParams عشان :accountId يوصل لكل اللي جوه.
 */
const scoped = Router({ mergeParams: true });

scoped.use(requireBusinessAccess);

scoped.get('/shops', shopController.list);
scoped.post('/shops', shopController.create);
scoped.put('/shops/:shopId', shopController.update);
scoped.delete('/shops/:shopId', shopController.remove);

scoped.get('/items', itemController.list);
scoped.post('/items', itemController.create);
scoped.get('/items/:itemId', itemController.get);
scoped.put('/items/:itemId', itemController.update);
scoped.delete('/items/:itemId', itemController.remove);

const router = Router();
router.use('/:accountId', scoped);

export default router;
