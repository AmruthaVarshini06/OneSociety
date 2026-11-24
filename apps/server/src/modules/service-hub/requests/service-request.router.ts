import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-request.service';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { userId, societyId, role } = req.user!;
  if (role === 'provider_external') return res.status(403).json({ message: 'External providers cannot create requests' });
  const request = await svc.createServiceRequest({
    ...req.body,
    seekerId: userId,
    societyId,
  });
  res.status(201).json(request);
});

router.get('/seeker', authenticate, async (req, res) => {
  const requests = await svc.getSeekerRequests(req.user!.userId);
  res.json(requests);
});

router.get('/provider', authenticate, async (req, res) => {
  const requests = await svc.getProviderRequests(req.user!.userId);
  res.json(requests);
});

router.get('/:id', authenticate, async (req, res) => {
  const request = await svc.getRequestById(req.params.id, req.user!.userId);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  res.json(request);
});

router.patch('/:id/respond', authenticate, async (req, res) => {
  const { userId, role } = req.user!;
  const updated = await svc.respondToRequest(req.params.id, userId, req.body);
  res.json(updated);
});

router.delete('/:id/cancel', authenticate, async (req, res) => {
  await svc.cancelRequest(req.params.id, req.user!.userId, req.body?.reason);
  res.json({ message: 'Cancelled' });
});

export default router;
