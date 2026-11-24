import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  getMyFamilyPassHandler,
  getMyPresidentPassHandler,
  getMyProviderPassHandler,
  createVisitorPassHandler,
  getVisitorPassByCodeHandler,
  listMyPassesHandler,
  revokePassHandler,
  scanPassHandler,
  confirmScanHandler,
  getLiveDashboardHandler,
  logManualVisitorHandler,
  markManualVisitorExitHandler,
  getCurrentlyInsideHandler,
  recordHandoverHandler,
  getPresenceStatusHandler,
  updatePresenceStatusHandler,
  searchFlatPresenceHandler,
} from '../controllers/gate.controller';

const router = Router();

router.get('/passes/code/:passCode', getVisitorPassByCodeHandler);

router.use(authenticate);

router.get('/passes/family', getMyFamilyPassHandler);
router.get('/passes/president', getMyPresidentPassHandler);
router.get('/passes/provider', getMyProviderPassHandler);
router.get('/passes/my-passes', listMyPassesHandler);
router.post('/passes/visitor', createVisitorPassHandler);
router.post('/passes/:passId/revoke', revokePassHandler);

router.post('/scan', scanPassHandler);
router.post('/scan/confirm', confirmScanHandler);
router.get('/dashboard', getLiveDashboardHandler);

router.post('/manual-visitor', logManualVisitorHandler);
router.post('/manual-visitor/:logId/exit', markManualVisitorExitHandler);
router.get('/inside', getCurrentlyInsideHandler);
router.post('/handover', recordHandoverHandler);

router.get('/presence', getPresenceStatusHandler);
router.post('/presence', updatePresenceStatusHandler);
router.get('/presence/search', searchFlatPresenceHandler);

export default router;
