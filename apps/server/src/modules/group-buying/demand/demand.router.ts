import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './demand.controller';

// mergeParams so we can read :orderId from the parent router
const router = Router({ mergeParams: true });
router.use(authenticate);

// Resident: express/update demand
router.put('/', requireRole('resident', 'president'), ctrl.upsertDemand);

// Resident: get own demand for this order
router.get('/me', requireRole('resident', 'president'), ctrl.getMyDemand);

// Resident: retract demand
router.delete('/', requireRole('resident', 'president'), ctrl.retractDemand);

export default router;
