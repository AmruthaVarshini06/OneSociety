import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as bookingController from './rental-booking.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];

router.post('/preview', ...residentOnly, bookingController.previewBooking);

router.get('/', ...auth, bookingController.listBookings);
router.get('/:id', ...auth, bookingController.getBookingById);

router.post('/', ...residentOnly, bookingController.createBooking);
router.post('/:id/pay', ...residentOnly, bookingController.payBooking);
router.post('/:id/cancel', ...residentOnly, bookingController.cancelBooking);

router.post('/:id/pickup-photos', ...residentOnly, bookingController.uploadPickupPhotos);
router.post('/:id/confirm-handover', ...residentOnly, bookingController.confirmHandover);

router.post('/:id/request-extension', ...residentOnly, bookingController.requestExtension);
router.post('/:id/respond-extension', ...residentOnly, bookingController.respondExtension);
router.post('/:id/pay-extension', ...residentOnly, bookingController.payExtension);

router.post('/:id/return-photos', ...residentOnly, bookingController.uploadReturnPhotos);
router.get('/:id/return-summary', ...residentOnly, bookingController.calculateReturnSummary);
router.post('/:id/confirm-return', ...residentOnly, bookingController.confirmReturn);
router.post('/:id/pay-overtime', ...residentOnly, bookingController.payOvertime);
router.post('/:id/renter-confirm', ...residentOnly, bookingController.renterConfirmReturn);

router.post('/:id/settle', ...residentOnly, bookingController.settleBooking);

router.post('/:id/respond', ...residentOnly, bookingController.respondToBooking);

export default router;
