import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './delivery.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);

// ── Resident: get own delivery pass ────────────────────────────────────────
router.get('/pass/mine', requireRole('resident', 'president'), ctrl.getMyDeliveryPass);

// ── Supplier: dispatch order ───────────────────────────────────────────────
router.post('/dispatch', requireRole('supplier', 'president'), ctrl.dispatchOrder);

// ── Manifest & Gate operations ─────────────────────────────────────────────
router.get(
  '/manifest',
  requireRole('guard', 'supplier', 'president', 'delivery_partner'),
  ctrl.getDeliveryManifest,
);
router.post('/gate/accept', requireRole('guard', 'president'), ctrl.acceptGateManifest);
router.get('/gate/pickups', requireRole('guard', 'president'), ctrl.getGatePickups);

// ── QR and OTP Verification ────────────────────────────────────────────────
router.post(
  '/verify-qr',
  requireRole('guard', 'delivery_partner', 'resident', 'president'),
  ctrl.verifyDeliveryQr,
);
router.post(
  '/request-otp',
  requireRole('guard', 'delivery_partner', 'president'),
  ctrl.requestOtpFallback,
);
router.post(
  '/verify-otp',
  requireRole('guard', 'delivery_partner', 'president'),
  ctrl.verifyOtpFallback,
);

export default router;
