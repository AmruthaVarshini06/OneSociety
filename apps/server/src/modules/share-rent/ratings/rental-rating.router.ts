import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ratingController from './rental-rating.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];

// Submit review for a booking
router.post('/bookings/:bookingId', ...residentOnly, ratingController.submitRating);

// Get ratings for a booking
router.get('/bookings/:bookingId', ...auth, ratingController.getRatingsForBooking);

// Get ratings for an item (public to society)
router.get('/items/:itemId', ...auth, ratingController.getRatingsForItem);

export default router;
