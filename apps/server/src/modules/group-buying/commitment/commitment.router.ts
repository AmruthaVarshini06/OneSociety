import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './commitment.controller';

// mergeParams: true allows access to :orderId from the group-order router
const router = Router({ mergeParams: true });
router.use(authenticate);

// ── Resident & President commitment routes ─────────────────────────────────
router.get('/mine', requireRole('resident', 'president'), ctrl.getMyCommitment);
router.post('/mine/pay/initiate', requireRole('resident', 'president'), ctrl.initiatePayment);
router.post('/mine/pay/confirm', requireRole('resident', 'president'), ctrl.confirmPayment);

// ── President order management routes ─────────────────────────────────────
router.post('/open', requireRole('president'), ctrl.openOrder);
router.post('/open-payment', requireRole('president'), ctrl.openPaymentWindow);
router.post('/close-payment', requireRole('president'), ctrl.closePaymentWindow);
router.get('/', requireRole('president'), ctrl.getCommitmentSummary);

export default router;
