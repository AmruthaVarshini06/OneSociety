import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './commitment.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/mine', requireRole('resident', 'president'), ctrl.getMyCommitment);
router.post('/mine/pay/initiate', requireRole('resident', 'president'), ctrl.initiatePayment);
router.post('/mine/pay/confirm', requireRole('resident', 'president'), ctrl.confirmPayment);

router.post('/open', requireRole('president'), ctrl.openOrder);
router.post('/open-payment', requireRole('president'), ctrl.openPaymentWindow);
router.post('/close-payment', requireRole('president'), ctrl.closePaymentWindow);
router.get('/', requireRole('president'), ctrl.getCommitmentSummary);

export default router;
