import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as disputeController from './rental-dispute.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];
const presidentOnly = [authenticate, requireRole('president')];

// President queue for pending/escalated disputes
router.get('/pending', ...presidentOnly, disputeController.listPendingDisputes);

// Get dispute for a booking
router.get('/bookings/:bookingId', ...auth, disputeController.getDisputeByBookingId);

// Owner creates dispute
router.post('/bookings/:bookingId', ...residentOnly, disputeController.createDispute);

// Renter accepts or contests dispute
router.post('/bookings/:bookingId/respond', ...residentOnly, disputeController.respondToDispute);

// Either party escalates to president
router.post('/bookings/:bookingId/escalate', ...residentOnly, disputeController.escalateDispute);

// President executes ruling and escrow split
router.post('/bookings/:bookingId/resolve-president', ...presidentOnly, disputeController.resolveDisputeByPresident);

export default router;
