import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './demand.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.put('/', requireRole('resident', 'president'), ctrl.upsertDemand);

router.get('/me', requireRole('resident', 'president'), ctrl.getMyDemand);

router.delete('/', requireRole('resident', 'president'), ctrl.retractDemand);

export default router;
