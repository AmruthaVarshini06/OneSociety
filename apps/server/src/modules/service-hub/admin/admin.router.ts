import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { query } from '../../../config/supabase';
import * as providerSvc from '../providers/provider.service';

const router = Router();

function presidentOnly(req: any, res: any, next: any) {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  next();
}

// Verification queue — pending providers
router.get('/verification-queue', authenticate, presidentOnly, async (req, res) => {
  const { societyId } = req.user!;
  const result = await query(
    `SELECT sp.*, u.username, u.email
     FROM service_providers sp
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE sp.society_id = $1 AND sp.status = 'PENDING_VERIFICATION'
     ORDER BY sp.created_at ASC`,
    [societyId]
  );
  res.json(result.rows);
});

// All providers list with optional filters
router.get('/providers', authenticate, presidentOnly, async (req, res) => {
  const { societyId } = req.user!;
  const providers = await providerSvc.listProviders({
    societyId,
    categorySlug: req.query.categorySlug as string | undefined,
    providerType: req.query.providerType as any,
    onlyVerified: false,
  });
  res.json(providers);
});

// Reports
router.get('/reports', authenticate, presidentOnly, async (req, res) => {
  const { societyId } = req.user!;

  const [activeServices, overduePayments, byCategory] = await Promise.all([
    query(
      `SELECT sa.*, u.username as seeker_username, sp.name as provider_name, sp.category
       FROM service_agreements sa
       LEFT JOIN users u ON u.id = sa.seeker_id
       LEFT JOIN service_providers sp ON sp.user_id = sa.provider_user_id
       WHERE sa.society_id = $1 AND sa.status = 'LOCKED'`,
      [societyId]
    ),
    query(
      `SELECT spay.*, u.username as seeker_username, pu.username as provider_username
       FROM service_payments spay
       LEFT JOIN users u ON u.id = spay.seeker_id
       LEFT JOIN users pu ON pu.id = spay.provider_user_id
       WHERE spay.society_id = $1 AND spay.status = 'OVERDUE'`,
      [societyId]
    ),
    query(
      `SELECT category as "_id", COUNT(*)::int as count, COALESCE(AVG(hourly_rate_paise), 0) as "avgRate"
       FROM service_providers
       WHERE society_id = $1 AND status = 'VERIFIED'
       GROUP BY category`,
      [societyId]
    ),
  ]);

  res.json({
    activeServices: activeServices.rows,
    overduePayments: overduePayments.rows,
    byCategory: byCategory.rows,
  });
});

// Create external provider account
router.post('/external-accounts', authenticate, presidentOnly, async (req, res) => {
  const result = await providerSvc.createExternalProviderAccount({
    societyId: req.user!.societyId,
    createdById: req.user!.userId,
    ...req.body,
  });
  res.status(201).json(result);
});

// Deactivate external account
router.patch('/external-accounts/:id/deactivate', authenticate, presidentOnly, async (req, res) => {
  const result = await query(
    `UPDATE service_providers SET status = 'DEACTIVATED' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Provider not found' });
  res.json(result.rows[0]);
});

// Convert to permanent
router.post('/external-accounts/:id/convert-permanent', authenticate, presidentOnly, async (req, res) => {
  const updated = await providerSvc.convertToPermanent(req.params.id, req.user!.userId);
  res.json(updated);
});

// All complaints
router.get('/complaints', authenticate, presidentOnly, async (req, res) => {
  const result = await query(
    `SELECT sc.*, u.username as filed_by_username, sp.name as provider_name
     FROM service_complaints sc
     LEFT JOIN users u ON u.id = sc.filed_by
     LEFT JOIN service_providers sp ON sp.id = sc.against_provider_id
     WHERE sc.society_id = $1
     ORDER BY sc.created_at DESC`,
    [req.user!.societyId]
  );
  res.json(result.rows);
});

export default router;
