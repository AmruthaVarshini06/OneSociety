import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './provider.service';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const { societyId, userId, role } = req.user!;
  const onlyVerified = role !== 'president';
  const providers = await svc.listProviders({
    societyId,
    categorySlug: req.query.categorySlug as string | undefined,
    optionSlug: req.query.optionSlug as string | undefined,
    providerType: req.query.providerType as any,
    workType: req.query.workType as any,
    language: req.query.language as string | undefined,
    minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
    maxPricePaise: req.query.maxPricePaise ? Number(req.query.maxPricePaise) : undefined,
    onlyVerified,
  });
  res.json(providers);
});

router.get('/:id', authenticate, async (req, res) => {
  const provider = await svc.getProviderById(req.params.id);
  if (!provider) return res.status(404).json({ message: 'Provider not found' });
  res.json(provider);
});

router.post('/register-internal', authenticate, async (req, res) => {
  const { userId, societyId, role } = req.user!;
  if (!['resident', 'provider_internal'].includes(role)) {
    return res.status(403).json({ message: 'Only residents can register as internal providers' });
  }
  const profile = await svc.registerInternalProvider({
    userId,
    societyId,
    ...req.body,
  });
  res.status(201).json(profile);
});

router.post('/external', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const result = await svc.createExternalProviderAccount({
    societyId: req.user!.societyId,
    createdById: req.user!.userId,
    ...req.body,
  });
  res.status(201).json(result);
});

router.patch('/:id', authenticate, async (req, res) => {
  const { userId, role } = req.user!;
  const profile = await svc.getProviderById(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Provider not found' });
  if (profile.userId.toString() !== userId && role !== 'president') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const updated = await svc.updateProviderProfile(profile.userId.toString(), req.body);
  res.json(updated);
});

router.post('/:id/convert-permanent', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const updated = await svc.convertToPermanent(req.params.id, req.user.userId);
  res.json(updated);
});

router.post('/:id/documents', authenticate, async (req, res) => {
  const { userId } = req.user!;
  const profile = await svc.getProviderById(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Provider not found' });
  if (profile.userId.toString() !== userId) return res.status(403).json({ message: 'Forbidden' });
  const doc = await svc.uploadProviderDocument({
    userId,
    societyId: req.user!.societyId,
    ...req.body,
  });
  res.status(201).json(doc);
});

router.get('/:id/documents', authenticate, async (req, res) => {
  const { userId, role } = req.user!;
  const profile = await svc.getProviderById(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Provider not found' });
  if (profile.userId.toString() !== userId && role !== 'president') {
    return res.status(403).json({ message: 'Documents are private' });
  }
  const docs = await svc.getProviderDocuments(req.params.id, userId, role);
  res.json(docs);
});

router.post('/:id/review', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const updated = await svc.reviewProvider(req.params.id, req.body.decision, req.body.notes ?? '', req.user!.userId);
  res.json(updated);
});

router.patch('/documents/:docId/review', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const doc = await svc.reviewDocument(req.params.docId, req.body.status, req.body.reviewerNote ?? '', req.user!.userId);
  res.json(doc);
});

export default router;
