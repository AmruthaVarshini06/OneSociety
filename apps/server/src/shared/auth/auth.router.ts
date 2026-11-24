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

router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);

router.post('/logout', authenticate, logoutHandler);
router.post('/change-password', authenticate, changePasswordHandler);
router.post('/fcm-token', authenticate, updateFcmTokenHandler);

router.post('/create-account', authenticate, requireRole('president'), createAccountHandler);

export default router;
