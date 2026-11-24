import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-complaint.service';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { userId, societyId } = req.user!;
  const { providerProfileId, category, description, requestId, agreementId } = req.body;
  if (!providerProfileId || !category || !description) return res.status(400).json({ message: 'providerProfileId, category, description required' });
  const complaint = await svc.fileComplaint(userId, societyId, providerProfileId, category, description, requestId, agreementId);
  res.status(201).json(complaint);
});

router.get('/', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const complaints = await svc.getAllComplaints(req.user.societyId, req.query.status as string | undefined);
  res.json(complaints);
});

router.patch('/:id/resolve', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const { notes, status } = req.body;
  if (!notes || !status) return res.status(400).json({ message: 'notes and status required' });
  const complaint = await svc.resolveComplaint(req.params.id, req.user.userId, notes, status);
  res.json(complaint);
});

export default router;
