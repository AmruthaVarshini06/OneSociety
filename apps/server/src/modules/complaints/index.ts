import { Router } from 'express';
import complaintRouter from './routes/complaint.router';
import presidentRouter from './routes/president.router';
import vendorRouter from './routes/vendor.router';

const router = Router();

router.use('/', complaintRouter);
router.use('/admin', presidentRouter);
router.use('/vendors', vendorRouter);

export default router;
