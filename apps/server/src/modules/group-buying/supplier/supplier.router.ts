import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './supplier.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── IMPORTANT: literal paths before param paths ───────────────────────────

// ── Supplier-only ─────────────────────────────────────────────────────────

/** Supplier views their own profile */
router.get('/me', requireRole('supplier'), ctrl.getMyProfile);

/** Supplier updates their own business details */
router.put('/me/profile', requireRole('supplier'), ctrl.updateMyProfile);

// ── President-only ────────────────────────────────────────────────────────

/** Create a new supplier account (president registers on behalf of supplier) */
router.post('/register', requireRole('president'), ctrl.registerSupplier);

/** List all suppliers in this society (filterable by status) */
router.get('/', requireRole('president', 'resident', 'supplier'), ctrl.listSuppliers);

/** Approve or reject a supplier */
router.patch('/:id/verify', requireRole('president'), ctrl.verifySupplier);

/** Get a specific supplier's full profile (audit-logged) — keep last, it's a catch-all param */
router.get('/:id', requireRole('president', 'resident', 'supplier'), ctrl.getSupplierById);

export default router;
