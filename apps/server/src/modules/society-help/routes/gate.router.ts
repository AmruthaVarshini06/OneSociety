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

// Public route: External visitor viewing their pass via shareable link
router.get('/passes/code/:passCode', getVisitorPassByCodeHandler);

// All subsequent routes require authentication
router.use(authenticate);

// Passes
router.get('/passes/family', getMyFamilyPassHandler);
router.get('/passes/president', getMyPresidentPassHandler);
router.get('/passes/provider', getMyProviderPassHandler);
router.get('/passes/my-passes', listMyPassesHandler);
router.post('/passes/visitor', createVisitorPassHandler);
router.post('/passes/:passId/revoke', revokePassHandler);

// Guard Scan & Flow
router.post('/scan', scanPassHandler);
router.post('/scan/confirm', confirmScanHandler);
router.get('/dashboard', getLiveDashboardHandler);

// Guard Manual Notepad & Currently Inside
router.post('/manual-visitor', logManualVisitorHandler);
router.post('/manual-visitor/:logId/exit', markManualVisitorExitHandler);
router.get('/inside', getCurrentlyInsideHandler);
router.post('/handover', recordHandoverHandler);

// Presence
router.get('/presence', getPresenceStatusHandler);
router.post('/presence', updatePresenceStatusHandler);
router.get('/presence/search', searchFlatPresenceHandler);

export default router;
