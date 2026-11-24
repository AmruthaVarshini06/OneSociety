import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-visit.service';
import { query } from '../../../config/supabase';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const { userId, role } = req.user!;
  const { agreementId, date } = req.query;

  if (agreementId) {
    const visits = await query('SELECT * FROM service_visits WHERE agreement_id = $1 ORDER BY scheduled_date ASC', [agreementId]);
    return res.json(visits.rows);
  }

  if (role === 'provider_external' || role === 'provider_internal') {
    if (date === 'today') {
      return res.json(await svc.getTodayVisits(userId));
    }
    return res.json(await svc.getUpcomingVisits(userId));
  }

  const visits = await query('SELECT * FROM service_visits WHERE seeker_id = $1 ORDER BY scheduled_date DESC', [userId]);
  res.json(visits.rows);
});

router.patch('/:id/confirm-provider', authenticate, async (req, res) => {
  const visit = await svc.confirmByProvider(req.params.id, req.user!.userId, req.body?.notes);
  res.json(visit);
});

router.patch('/:id/confirm-seeker', authenticate, async (req, res) => {
  const visit = await svc.confirmBySeeker(req.params.id, req.user!.userId, req.body?.notes);
  res.json(visit);
});

router.patch('/:id/no-show', authenticate, async (req, res) => {
  const visit = await svc.markNoShow(req.params.id, req.user!.userId);
  res.json(visit);
});

export default router;
