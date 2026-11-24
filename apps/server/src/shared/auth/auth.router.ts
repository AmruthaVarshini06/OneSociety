import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  changePasswordHandler,
  createAccountHandler,
  updateFcmTokenHandler,
} from './auth.controller';

const router = Router();

// Public routes
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);

// Authenticated routes (any role)
router.post('/logout', authenticate, logoutHandler);
router.post('/change-password', authenticate, changePasswordHandler);
router.post('/fcm-token', authenticate, updateFcmTokenHandler);

// President-only
router.post('/create-account', authenticate, requireRole('president'), createAccountHandler);

export default router;
