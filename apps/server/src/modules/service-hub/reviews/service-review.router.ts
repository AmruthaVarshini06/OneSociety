import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-review.service';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { userId } = req.user!;
  const { agreementId, visitId, reviewType, overallRating, punctualityRating, qualityRating, behaviourRating, comment, wouldHireAgain } = req.body;
  if (!agreementId || !reviewType || !overallRating) return res.status(400).json({ message: 'agreementId, reviewType, overallRating required' });

  let review;
  const ratings = { overallRating: Number(overallRating), punctualityRating: punctualityRating ? Number(punctualityRating) : undefined, qualityRating: qualityRating ? Number(qualityRating) : undefined, behaviourRating: behaviourRating ? Number(behaviourRating) : undefined };

  if (reviewType === 'MID_SERVICE') {
    review = await svc.submitMidServiceReview(agreementId, visitId, userId, ratings, comment);
  } else {
    review = await svc.submitFinalReview(agreementId, userId, ratings, comment, wouldHireAgain);
  }
  res.status(201).json(review);
});

router.get('/provider/:profileId', async (req, res) => {
  const reviews = await svc.getProviderReviews(req.params.profileId);
  res.json(reviews);
});

router.patch('/:id/report-abuse', authenticate, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'reason required' });
  await svc.reportAbuse(req.params.id, req.user!.userId, reason);
  res.json({ message: 'Reported' });
});

router.delete('/:id', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  await svc.removeReview(req.params.id, req.user.userId);
  res.json({ message: 'Review removed' });
});

export default router;
