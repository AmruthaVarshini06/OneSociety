import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  triggerEmergencyHandler,
  acknowledgeEmergencyHandler,
  cancelEmergencyHandler,
  getActiveAlertsHandler,
  getAlertHistoryHandler,
} from '../controllers/emergency.controller';

const router = Router();

router.use(authenticate);

router.post('/trigger', triggerEmergencyHandler);
router.post('/:alertId/ack', acknowledgeEmergencyHandler);
router.post('/:alertId/cancel', cancelEmergencyHandler);
router.get('/active', getActiveAlertsHandler);
router.get('/history', getAlertHistoryHandler);

export default router;
