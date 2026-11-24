import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-chat.service';

const router = Router();

router.get('/:requestId', authenticate, async (req, res) => {
  const messages = await svc.getChatMessages(req.params.requestId, req.user!.userId);
  res.json(messages);
});

router.post('/:requestId/message', authenticate, async (req, res) => {
  const { userId } = req.user!;
  const { text, senderRole } = req.body;
  if (!text || !senderRole) return res.status(400).json({ message: 'text and senderRole required' });
  const msg = await svc.sendMessage(req.params.requestId, userId, senderRole, text);
  res.status(201).json(msg);
});

router.post('/:requestId/price-offer', authenticate, async (req, res) => {
  const msg = await svc.sendPriceOffer(req.params.requestId, req.user!.userId, req.body);
  res.status(201).json(msg);
});

router.patch('/:requestId/price-offer/:offerId', authenticate, async (req, res) => {
  const { action, counterOffer } = req.body;
  if (!action) return res.status(400).json({ message: 'action required' });
  await svc.respondToPriceOffer(req.params.requestId, req.params.offerId, req.user!.userId, action, counterOffer);
  res.json({ message: 'OK' });
});

export default router;
