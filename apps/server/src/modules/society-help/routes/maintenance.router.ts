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

// Financial Plan & Accounts
router.get('/plan', getPlanHandler);
router.get('/accounts', getAccountsDashboardHandler);

// Dues & Payments
router.get('/dues', getDuesHandler);
router.post('/dues/:dueId/pay', payDueInAppHandler);
router.post('/dues/:dueId/offline', recordOfflineDuePaymentHandler);

// Expenses & Other Income
router.post('/expenses', recordExpenseHandler);
router.post('/incomes', recordOtherIncomeHandler);
router.post('/expenses/link-complaint', linkComplaintExpenseHandler);

// Security Staff Payroll
router.post('/payroll/watchman', recordWatchmanSalaryHandler);
router.get('/payroll/guard', getGuardSalaryRecordsHandler);

// Resident Queries & President Replies
router.post('/ledger/:ledgerEntryId/query', raiseExpenseQueryHandler);
router.get('/ledger/:ledgerEntryId/queries', getQueriesForEntryHandler);
router.post('/queries/:queryId/reply', replyExpenseQueryHandler);

export default router;
