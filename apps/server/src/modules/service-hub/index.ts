import { Router } from 'express';
import categoryRouter from './categories/service-category.router';
import providerRouter from './providers/provider.router';
import requestRouter from './requests/service-request.router';
import chatRouter from './chat/service-chat.router';
import agreementRouter from './agreements/service-agreement.router';
import visitRouter from './visits/service-visit.router';
import paymentRouter from './payments/service-payment.router';
import reviewRouter from './reviews/service-review.router';
import complaintRouter from './complaints/service-complaint.router';
import adminRouter from './admin/admin.router';

const router = Router();

router.use('/categories', categoryRouter);
router.use('/providers', providerRouter);
router.use('/requests', requestRouter);
router.use('/chat', chatRouter);
router.use('/agreements', agreementRouter);
router.use('/visits', visitRouter);
router.use('/payments', paymentRouter);
router.use('/reviews', reviewRouter);
router.use('/complaints', complaintRouter);
router.use('/admin', adminRouter);

export default router;
