import { Router } from 'express';
import * as showroomController from '../controllers/showroom.controller.js';

/**
 * المعرض — من غير تسجيل دخول: الزائر بيشوف المتاجر وأصنافها كمان. المتاجر
 * نفسها (أساميها وأنشطتها ومكانها) من وصلة، وده اللي أسواق بيضيفه عليها.
 */
const router = Router();

router.get('/stores', showroomController.listDelivery);
router.get('/stores/:shopId', showroomController.getStore);

export default router;
