import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import {
  getSuggestedVendorsHandler,
  getLocalVendorsHandler,
  createLocalVendorHandler,
  updateLocalVendorHandler,
  getBatchingOpportunitiesHandler,
  checkClashHandler,
} from '../controllers/vendor.controller';

const router = Router();

router.use(authenticate);

// Suggested vendors can be viewed by president and residents
router.get('/suggested', getSuggestedVendorsHandler);
router.get('/clash-check', checkClashHandler);

// Local Vendor directory management & batching: President only
router.get('/local', requireRole('president'), getLocalVendorsHandler);
router.post('/local', requireRole('president'), createLocalVendorHandler);
router.put('/local/:id', requireRole('president'), updateLocalVendorHandler);
router.get('/batching', requireRole('president'), getBatchingOpportunitiesHandler);

export default router;
