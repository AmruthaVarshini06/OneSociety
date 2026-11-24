import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './dispute.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);

// ── Issues & Disputes ──────────────────────────────────────────────────────
router.post('/issues', requireRole('resident', 'president'), ctrl.reportIssue);
router.get('/issues', requireRole('resident', 'supplier', 'president'), ctrl.listIssues);
router.patch('/issues/:issueId/respond', requireRole('supplier', 'president'), ctrl.supplierRespondIssue);
router.patch('/issues/:issueId/escalate', requireRole('resident', 'president'), ctrl.escalateIssue);
router.patch(
  '/issues/:issueId/resolve-president',
  requireRole('president'),
  ctrl.presidentResolveIssue,
);

// ── Ratings ────────────────────────────────────────────────────────────────
router.get('/ratings/mine', requireRole('resident', 'president'), ctrl.getMyRating);
router.post('/ratings', requireRole('resident', 'president'), ctrl.submitRating);

// ── Escrow Settlement ──────────────────────────────────────────────────────
router.post('/settle', requireRole('president'), ctrl.settleOrderEscrow);

export default router;
