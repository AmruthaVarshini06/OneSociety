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

router.post('/scope-check', checkScopeHandler);
router.post('/similar', getSimilarHandler);

router.post('/', submitComplaintHandler);
router.get('/feed', getFeedHandler);
router.get('/cluster/:id', getClusterDetailsHandler);

router.put('/:id/edit', editComplaintHandler);
router.post('/:id/withdraw', withdrawComplaintHandler);

router.post('/cluster/:id/reopen', reopenIssueHandler);
router.post('/cluster/:id/confirm-fixed', confirmFixedHandler);

export default router;
