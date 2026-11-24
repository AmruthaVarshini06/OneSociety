import type { Request, Response } from 'express';
import { upsertDemandSchema } from './demand.schema';
import * as svc from './demand.service';
import { query } from '../../../config/supabase';

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

async function resolveFlatId(userId: string, societyId: string): Promise<string> {
  const userRes = await query('SELECT flat_id FROM users WHERE id = $1', [userId]);
  if (userRes.rows[0]?.flat_id) return userRes.rows[0].flat_id.toString();
  const flatRes = await query('SELECT id FROM flats WHERE society_id = $1 LIMIT 1', [societyId]);
  if (!flatRes.rows[0]) throw httpError(400, 'No flat linked to your account');
  return flatRes.rows[0].id.toString();
}

export async function upsertDemand(req: Request, res: Response): Promise<void> {
  const data = upsertDemandSchema.parse(req.body);
  const flatId = await resolveFlatId(req.user!.userId, req.user!.societyId);
  const { item, totalDemandedQuantity } = await svc.upsertDemand(
    req.params.orderId,
    req.user!.societyId,
    req.user!.userId,
    flatId,
    data,
  );
  res.json({ message: 'Demand recorded', item, totalDemandedQuantity });
}

export async function retractDemand(req: Request, res: Response): Promise<void> {
  const flatId = await resolveFlatId(req.user!.userId, req.user!.societyId);
  const { totalDemandedQuantity } = await svc.retractDemand(
    req.params.orderId,
    req.user!.societyId,
    flatId,
  );
  res.json({ message: 'Demand retracted', totalDemandedQuantity });
}

export async function getMyDemand(req: Request, res: Response): Promise<void> {
  const flatId = await resolveFlatId(req.user!.userId, req.user!.societyId);
  const item = await svc.getMyDemand(req.params.orderId, flatId);
  res.json({ item: item ?? null });
}
