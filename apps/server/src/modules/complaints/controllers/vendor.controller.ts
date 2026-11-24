import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  getSuggestedVendors,
  checkVendorScheduleClash,
  detectBatchingOpportunities,
} from '../services/vendor-directory.service';

export async function getSuggestedVendorsHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const category = (req.query.category as string) || 'Other';
  const vendors = await getSuggestedVendors(societyId, category);
  res.json({ vendors });
}

export async function getLocalVendorsHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const vRes = await query('SELECT * FROM vendors WHERE society_id = $1 ORDER BY name ASC', [societyId]);
  res.json({ vendors: vRes.rows });
}

export async function createLocalVendorHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const { name, phone, trade, notes } = req.body;

  if (!name || !phone || !trade) {
    res.status(400).json({ error: 'Name, phone, and trade are required.' });
    return;
  }

  const vRes = await query(
    `INSERT INTO vendors (society_id, name, service_type, phone, rating)
     VALUES ($1, $2, $3, $4, 4.5)
     RETURNING *`,
    [societyId, name, trade, phone]
  );

  res.status(201).json({ vendor: vRes.rows[0] });
}

export async function updateLocalVendorHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const { id } = req.params;
  const { name, phone, trade } = req.body;

  const vRes = await query(
    `UPDATE vendors 
     SET name = COALESCE($1, name), service_type = COALESCE($2, service_type), phone = COALESCE($3, phone)
     WHERE id = $4 AND society_id = $5
     RETURNING *`,
    [name, trade, phone, id, societyId]
  );

  if (vRes.rows.length === 0) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }

  res.json({ vendor: vRes.rows[0] });
}

export async function checkClashHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const { vendorPhone, visitDate, currentClusterId } = req.query;

  if (!vendorPhone || !visitDate) {
    res.status(400).json({ error: 'vendorPhone and visitDate are required.' });
    return;
  }

  const result = await checkVendorScheduleClash(
    societyId,
    vendorPhone as string,
    new Date(visitDate as string),
    currentClusterId as string
  );
  res.json(result);
}

export async function getBatchingOpportunitiesHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const suggestions = await detectBatchingOpportunities(societyId);
  res.json({ suggestions });
}
