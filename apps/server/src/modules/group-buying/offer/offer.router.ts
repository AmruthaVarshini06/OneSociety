import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './offer.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/mine', requireRole('supplier'), ctrl.getMyOffer);

router.put('/', requireRole('supplier'), ctrl.submitOffer);

router.get('/', requireRole('president'), ctrl.listOffers);

router.post('/:offerId/select', requireRole('president'), ctrl.selectOffer);

export default router;
