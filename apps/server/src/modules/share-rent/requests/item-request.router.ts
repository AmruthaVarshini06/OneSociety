import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as itemRequestController from './item-request.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];

router.post('/', ...residentOnly, itemRequestController.createRequest);
router.get('/', ...auth, itemRequestController.listRequests);
router.get('/mine', ...residentOnly, itemRequestController.getMyRequests);
router.get('/:id', ...auth, itemRequestController.getRequestById);
router.post('/:id/dismiss', ...residentOnly, itemRequestController.dismissRequest);
router.post('/:id/cancel', ...residentOnly, itemRequestController.cancelRequest);

router.post('/:id/offers', ...residentOnly, itemRequestController.makeOffer);
router.post('/:id/offers/:offerId/accept', ...residentOnly, itemRequestController.acceptOffer);
router.delete('/:id/offers/:offerId', ...residentOnly, itemRequestController.withdrawOffer);

export default router;
