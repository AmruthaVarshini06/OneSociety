import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ratingController from './rental-rating.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];

router.post('/bookings/:bookingId', ...residentOnly, ratingController.submitRating);

router.get('/bookings/:bookingId', ...auth, ratingController.getRatingsForBooking);

router.get('/items/:itemId', ...auth, ratingController.getRatingsForItem);

export default router;
