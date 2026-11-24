import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './offer.controller';

// mergeParams so we can read :orderId from parent router
const router = Router({ mergeParams: true });
router.use(authenticate);

// Supplier: view own offer — BEFORE /:offerId so "mine" isn't captured by param
router.get('/mine', requireRole('supplier'), ctrl.getMyOffer);

// Supplier: submit / update offer
router.put('/', requireRole('supplier'), ctrl.submitOffer);

// President: list all offers for an order
router.get('/', requireRole('president'), ctrl.listOffers);

// President: select winning offer
router.post('/:offerId/select', requireRole('president'), ctrl.selectOffer);

export default router;
