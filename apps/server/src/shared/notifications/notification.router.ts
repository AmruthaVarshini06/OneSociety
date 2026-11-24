import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './notification.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getNotifications);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

export default router;
