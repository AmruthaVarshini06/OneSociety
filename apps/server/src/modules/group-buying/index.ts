import { Router } from 'express';
import supplierRouter from './supplier/supplier.router';
import groupOrderRouter from './group-order/group-order.router';

const router = Router();

router.use('/suppliers', supplierRouter);
router.use('/orders', groupOrderRouter);

export default router;
