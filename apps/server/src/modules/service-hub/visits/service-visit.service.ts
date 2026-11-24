import { query } from '../../../config/supabase';

export async function getTodayVisits(providerUserId: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM service_visits WHERE provider_user_id = $1 AND scheduled_date = CURRENT_DATE ORDER BY created_at ASC`,
    [providerUserId]
  );
  return res.rows;
}

export async function getUpcomingVisits(providerUserId: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM service_visits WHERE provider_user_id = $1 AND scheduled_date >= CURRENT_DATE ORDER BY scheduled_date ASC`,
    [providerUserId]
  );
  return res.rows;
}

export async function confirmByProvider(visitId: string, providerUserId: string, notes?: string): Promise<any> {
  const res = await query(
    `UPDATE service_visits SET status = 'CONFIRMED_PROVIDER' WHERE id = $1 RETURNING *`,
    [visitId]
  );
  return res.rows[0];
}

export async function confirmBySeeker(visitId: string, seekerId: string, notes?: string): Promise<any> {
  const res = await query(
    `UPDATE service_visits SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1 RETURNING *`,
    [visitId]
  );
  return res.rows[0];
}

export async function markNoShow(visitId: string, userId: string): Promise<any> {
  const res = await query(
    `UPDATE service_visits SET status = 'NO_SHOW' WHERE id = $1 RETURNING *`,
    [visitId]
  );
  return res.rows[0];
}
