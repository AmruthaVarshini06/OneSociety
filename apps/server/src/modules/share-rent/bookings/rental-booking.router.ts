import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as bookingController from './rental-booking.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];

// Preview charge calculation (no DB write)
router.post('/preview', ...residentOnly, bookingController.previewBooking);

// List and get
router.get('/', ...auth, bookingController.listBookings);
router.get('/:id', ...auth, bookingController.getBookingById);

// Renter actions
router.post('/', ...residentOnly, bookingController.createBooking);
router.post('/:id/pay', ...residentOnly, bookingController.payBooking);
router.post('/:id/cancel', ...residentOnly, bookingController.cancelBooking);

// Phase 4: Pickup & Handover
router.post('/:id/pickup-photos', ...residentOnly, bookingController.uploadPickupPhotos);
router.post('/:id/confirm-handover', ...residentOnly, bookingController.confirmHandover);

// Phase 4: Extensions
router.post('/:id/request-extension', ...residentOnly, bookingController.requestExtension);
router.post('/:id/respond-extension', ...residentOnly, bookingController.respondExtension);
router.post('/:id/pay-extension', ...residentOnly, bookingController.payExtension);

// Phase 5: Return & Final Time-based Charge
router.post('/:id/return-photos', ...residentOnly, bookingController.uploadReturnPhotos);
router.get('/:id/return-summary', ...residentOnly, bookingController.calculateReturnSummary);
router.post('/:id/confirm-return', ...residentOnly, bookingController.confirmReturn);
router.post('/:id/pay-overtime', ...residentOnly, bookingController.payOvertime);
router.post('/:id/renter-confirm', ...residentOnly, bookingController.renterConfirmReturn);

// Phase 6: Settlement
router.post('/:id/settle', ...residentOnly, bookingController.settleBooking);

// Owner action
router.post('/:id/respond', ...residentOnly, bookingController.respondToBooking);

export default router;
