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

// All roles: list and view group orders
router.get('/', requireRole('resident', 'president', 'supplier', 'guard', 'delivery_partner', 'provider_internal', 'provider_external'), ctrl.listGroupOrders);
router.get('/:id', requireRole('resident', 'president', 'supplier', 'guard', 'delivery_partner', 'provider_internal', 'provider_external'), ctrl.getGroupOrder);

// President only: create, cancel, see demand summary
router.post('/', requireRole('president'), ctrl.createGroupOrder);
router.patch('/:id/cancel', requireRole('president'), ctrl.cancelGroupOrder);
router.get('/:id/demand-summary', requireRole('president'), ctrl.getDemandSummary);

// Demand sub-routes under /:orderId/demand
router.use('/:orderId/demand', demandRouter);

// Offer sub-routes under /:orderId/offers
router.use('/:orderId/offers', offerRouter);

// Commitment sub-routes under /:orderId/commitments
router.use('/:orderId/commitments', commitmentRouter);

// Delivery sub-routes under /:orderId/delivery
router.use('/:orderId/delivery', deliveryRouter);

// Dispute, Rating and Settlement routes under /:orderId
router.use('/:orderId', disputeRouter);

export default router;
