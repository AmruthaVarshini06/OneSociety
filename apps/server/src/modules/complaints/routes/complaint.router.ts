import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  checkScopeHandler,
  getSimilarHandler,
  submitComplaintHandler,
  getFeedHandler,
  getClusterDetailsHandler,
  editComplaintHandler,
  withdrawComplaintHandler,
  reopenIssueHandler,
  confirmFixedHandler,
} from '../controllers/complaint.controller';

const router = Router();

router.use(authenticate);

// Scope check and similarity suggestions (pre-submit)
router.post('/scope-check', checkScopeHandler);
router.post('/similar', getSimilarHandler);

// Submitting & Feed
router.post('/', submitComplaintHandler);
router.get('/feed', getFeedHandler);
router.get('/cluster/:id', getClusterDetailsHandler);

// Resident action on own complaint (before CONTACTED)
router.put('/:id/edit', editComplaintHandler);
router.post('/:id/withdraw', withdrawComplaintHandler);

// Resident action on solved issue
router.post('/cluster/:id/reopen', reopenIssueHandler);
router.post('/cluster/:id/confirm-fixed', confirmFixedHandler);

export default router;
