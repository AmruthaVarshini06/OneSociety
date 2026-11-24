import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import {
  getPlanHandler,
  getDuesHandler,
  payDueInAppHandler,
  recordOfflineDuePaymentHandler,
  recordExpenseHandler,
  recordOtherIncomeHandler,
  recordWatchmanSalaryHandler,
  getGuardSalaryRecordsHandler,
  linkComplaintExpenseHandler,
  getAccountsDashboardHandler,
  raiseExpenseQueryHandler,
  replyExpenseQueryHandler,
  getQueriesForEntryHandler,
} from '../controllers/maintenance.controller';

const router = Router();

router.use(authenticate);

router.get('/plan', getPlanHandler);
router.get('/accounts', getAccountsDashboardHandler);

router.get('/dues', getDuesHandler);
router.post('/dues/:dueId/pay', payDueInAppHandler);
router.post('/dues/:dueId/offline', recordOfflineDuePaymentHandler);

router.post('/expenses', recordExpenseHandler);
router.post('/incomes', recordOtherIncomeHandler);
router.post('/expenses/link-complaint', linkComplaintExpenseHandler);

router.post('/payroll/watchman', recordWatchmanSalaryHandler);
router.get('/payroll/guard', getGuardSalaryRecordsHandler);

router.post('/ledger/:ledgerEntryId/query', raiseExpenseQueryHandler);
router.get('/ledger/:ledgerEntryId/queries', getQueriesForEntryHandler);
router.post('/queries/:queryId/reply', replyExpenseQueryHandler);

export default router;
