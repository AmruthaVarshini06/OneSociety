import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/requireRole';
import * as ctrl from './supplier.controller';

const router = Router();

router.use(authenticate);

router.get('/me', requireRole('supplier'), ctrl.getMyProfile);

router.put('/me/profile', requireRole('supplier'), ctrl.updateMyProfile);

router.post('/register', requireRole('president'), ctrl.registerSupplier);

router.get('/', requireRole('president', 'resident', 'supplier'), ctrl.listSuppliers);

router.patch('/:id/verify', requireRole('president'), ctrl.verifySupplier);

router.get('/:id', requireRole('president', 'resident', 'supplier'), ctrl.getSupplierById);

export default router;
