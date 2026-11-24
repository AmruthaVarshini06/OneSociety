import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as rentalItemController from './rental-item.controller';

const router = Router();

router.get('/catalog', authenticate, requireRole('resident', 'president'), rentalItemController.getCatalog);
router.post('/verify-price', authenticate, requireRole('resident', 'president'), rentalItemController.verifyPrice);
router.get('/', authenticate, requireRole('resident', 'president'), rentalItemController.listItems);
router.post('/', authenticate, requireRole('resident'), rentalItemController.createItem);
router.get('/my-items', authenticate, requireRole('resident'), rentalItemController.getMyItems);

router.get('/pending-reviews', authenticate, requireRole('president'), rentalItemController.listPendingReviews);
router.post('/:id/review', authenticate, requireRole('president'), rentalItemController.presidentReviewItem);

router.get('/:id', authenticate, requireRole('resident', 'president'), rentalItemController.getItemById);
router.patch('/:id', authenticate, requireRole('resident'), rentalItemController.updateItem);
router.patch('/:id/availability', authenticate, requireRole('resident'), rentalItemController.toggleAvailability);
router.post('/:id/escalate', authenticate, requireRole('resident'), rentalItemController.escalateItem);
router.delete('/:id', authenticate, requireRole('resident', 'president'), rentalItemController.deleteItem);

export default router;
