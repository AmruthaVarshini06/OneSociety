import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './group-order.controller';
import demandRouter from '../demand/demand.router';
import offerRouter from '../offer/offer.router';
import commitmentRouter from '../commitment/commitment.router';
import deliveryRouter from '../delivery/delivery.router';
import disputeRouter from '../dispute/dispute.router';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('resident', 'president', 'supplier', 'guard', 'delivery_partner', 'provider_internal', 'provider_external'), ctrl.listGroupOrders);
router.get('/:id', requireRole('resident', 'president', 'supplier', 'guard', 'delivery_partner', 'provider_internal', 'provider_external'), ctrl.getGroupOrder);

router.post('/', requireRole('president'), ctrl.createGroupOrder);
router.patch('/:id/cancel', requireRole('president'), ctrl.cancelGroupOrder);
router.get('/:id/demand-summary', requireRole('president'), ctrl.getDemandSummary);

router.use('/:orderId/demand', demandRouter);

router.use('/:orderId/offers', offerRouter);

router.use('/:orderId/commitments', commitmentRouter);

router.use('/:orderId/delivery', deliveryRouter);

router.use('/:orderId', disputeRouter);

export default router;
