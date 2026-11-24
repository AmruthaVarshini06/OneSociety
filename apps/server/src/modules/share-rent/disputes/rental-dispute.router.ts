import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as disputeController from './rental-dispute.controller';

const router = Router();

const auth = [authenticate, requireRole('resident', 'president')];
const residentOnly = [authenticate, requireRole('resident')];
const presidentOnly = [authenticate, requireRole('president')];

router.get('/pending', ...presidentOnly, disputeController.listPendingDisputes);

router.get('/bookings/:bookingId', ...auth, disputeController.getDisputeByBookingId);

router.post('/bookings/:bookingId', ...residentOnly, disputeController.createDispute);

router.post('/bookings/:bookingId/respond', ...residentOnly, disputeController.respondToDispute);

router.post('/bookings/:bookingId/escalate', ...residentOnly, disputeController.escalateDispute);

router.post('/bookings/:bookingId/resolve-president', ...presidentOnly, disputeController.resolveDisputeByPresident);

export default router;
