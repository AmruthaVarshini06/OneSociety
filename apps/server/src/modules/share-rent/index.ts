import { Router } from 'express';
import rentalItemRouter from './items/rental-item.router';
import itemRequestRouter from './requests/item-request.router';
import bookingRouter from './bookings/rental-booking.router';
import disputeRouter from './disputes/rental-dispute.router';
import ratingRouter from './ratings/rental-rating.router';

const router = Router();

router.use('/items', rentalItemRouter);
router.use('/requests', itemRequestRouter);
router.use('/bookings', bookingRouter);
router.use('/disputes', disputeRouter);
router.use('/ratings', ratingRouter);

export default router;
