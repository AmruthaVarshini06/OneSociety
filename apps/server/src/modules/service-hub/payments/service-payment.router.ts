import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-payment.service';

const router = Router();

router.get('/earnings', authenticate, async (req, res) => {
  const earnings = await svc.getProviderEarnings(req.user!.userId);
  res.json(earnings);
});

router.get('/', authenticate, async (req, res) => {
  const { userId, role } = req.user!;
  if (['provider_external', 'provider_internal'].includes(role)) {
    const earnings = await svc.getProviderEarnings(userId);
    return res.json(earnings);
  }
  const payments = await svc.getSeekerPayments(userId);
  res.json(payments);
});

router.post('/:id/pay', authenticate, async (req, res) => {
  const { amountPaise, mode, offlineReference } = req.body;
  if (!amountPaise || !mode) return res.status(400).json({ message: 'amountPaise and mode required' });
  const payment = await svc.recordPayment(req.params.id, req.user!.userId, Number(amountPaise), mode, offlineReference);
  res.json(payment);
});

router.post('/:id/confirm-receipt', authenticate, async (req, res) => {
  const payment = await svc.confirmReceipt(req.params.id, req.user!.userId);
  res.json(payment);
});

export default router;
