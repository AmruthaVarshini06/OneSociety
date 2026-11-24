import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import {
  getDashboardMetricsHandler,
  getReportsHandler,
  markContactedHandler,
  startWorkInProgressHandler,
  addProgressUpdateHandler,
  markSolvedHandler,
  recordCostHandler,
  recordPaymentHandler,
  markOutOfScopeHandler,
  overridePriorityHandler,
  mergeClustersHandler,
  splitClusterHandler,
  hideSpamHandler,
} from '../controllers/president.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('president'));

// Dashboard & Reports
router.get('/dashboard', getDashboardMetricsHandler);
router.get('/reports', getReportsHandler);

// Workflow state machine transitions
router.post('/cluster/:id/contacted', markContactedHandler);
router.post('/cluster/:id/work-in-progress', startWorkInProgressHandler);
router.post('/cluster/:id/progress-update', addProgressUpdateHandler);
router.post('/cluster/:id/solved', markSolvedHandler);
router.post('/cluster/:id/cost', recordCostHandler);
router.post('/cluster/:id/payment', recordPaymentHandler);
router.post('/cluster/:id/out-of-scope', markOutOfScopeHandler);
router.post('/cluster/:id/override-priority', overridePriorityHandler);

// Concurrency & Clustering tools
router.post('/merge', mergeClustersHandler);
router.post('/split', splitClusterHandler);
router.post('/complaint/:id/spam', hideSpamHandler);

export default router;
