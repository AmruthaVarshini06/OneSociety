import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-agreement.service';

const router = Router();

router.get('/:id', authenticate, async (req, res) => {
  const ag = await svc.getAgreement(req.params.id, req.user!.userId);
  res.json(ag);
});

router.post('/:id/propose-revision', authenticate, async (req, res) => {
  const { newPricePaise, reason } = req.body;
  if (!newPricePaise || !reason) return res.status(400).json({ message: 'newPricePaise and reason required' });
  const ag = await svc.proposeRevision(req.params.id, req.user!.userId, Number(newPricePaise), reason);
  res.json(ag);
});

router.patch('/:id/revision-response', authenticate, async (req, res) => {
  const { action } = req.body;
  if (!['ACCEPT', 'REJECT'].includes(action)) return res.status(400).json({ message: 'action must be ACCEPT or REJECT' });
  const ag = await svc.respondToRevision(req.params.id, req.user!.userId, action);
  res.json(ag);
});

router.post('/:id/terminate', authenticate, async (req, res) => {
  const { reason, noticeDays } = req.body;
  if (!reason) return res.status(400).json({ message: 'reason required' });
  await svc.terminateAgreement(req.params.id, req.user!.userId, reason, noticeDays);
  res.json({ message: 'Agreement terminated' });
});

router.post('/:id/complete', authenticate, async (req, res) => {
  await svc.completeAgreement(req.params.id);
  res.json({ message: 'Agreement completed' });
});

export default router;
