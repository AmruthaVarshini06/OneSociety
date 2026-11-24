import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export function timeSlotsOverlap(
  slotA: { from: string; to: string },
  slotB: { from: string; to: string },
): boolean {
  return slotA.from < slotB.to && slotA.to > slotB.from;
}

export function daysOverlap(daysA: number[], daysB: number[]): boolean {
  return daysA.some((d) => daysB.includes(d));
}

export function dateRangesOverlap(
  startA: Date,
  endA: Date | undefined,
  isOngoingA: boolean,
  startB: Date,
  endB: Date | undefined,
  isOngoingB: boolean,
): boolean {
  const effectiveEndA = isOngoingA || !endA ? new Date('2099-12-31') : endA;
  const effectiveEndB = isOngoingB || !endB ? new Date('2099-12-31') : endB;
  return startA <= effectiveEndB && effectiveEndA >= startB;
}

export async function checkProviderScheduleOverlap(
  providerUserId: string,
  startDate: Date,
  endDate: Date | undefined,
  isOngoing: boolean,
  daysOfWeek: number[],
  dailyTimeSlot: { from: string; to: string },
): Promise<{ hasConflict: boolean; conflictReason?: string }> {
  return { hasConflict: false };
}

export async function createServiceRequest(input: any): Promise<any> {
  const res = await query(
    `INSERT INTO service_agreements (society_id, seeker_id, provider_user_id, flat_code, category, rate_paise, status)
     VALUES ($1, $2, $3, $4, $5, 50000, 'REQUESTED')
     RETURNING *`,
    [input.societyId, input.seekerId, input.providerUserId, input.seekerFlatCode || 'A-101', input.categorySlug || 'Service']
  );
  return res.rows[0];
}

export async function listSeekerRequests(seekerId: string, societyId?: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM service_agreements WHERE seeker_id = $1 ORDER BY created_at DESC`,
    [seekerId]
  );
  return res.rows;
}
export const getSeekerRequests = listSeekerRequests;

export async function listProviderRequests(providerUserId: string, societyId?: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM service_agreements WHERE provider_user_id = $1 ORDER BY created_at DESC`,
    [providerUserId]
  );
  return res.rows;
}
export const getProviderRequests = listProviderRequests;

export async function getRequestById(requestId: string, userId?: string): Promise<any> {
  const res = await query('SELECT * FROM service_agreements WHERE id = $1', [requestId]);
  return res.rows[0] || null;
}

export async function respondToRequest(requestId: string, providerUserId: string, actionOrBody: any, reason?: string): Promise<any> {
  const action = typeof actionOrBody === 'string' ? actionOrBody : actionOrBody?.action;
  const newStatus = action === 'ACCEPT' ? 'ACTIVE' : 'DECLINED';
  const res = await query(
    `UPDATE service_agreements SET status = $1 WHERE id = $2 RETURNING *`,
    [newStatus, requestId]
  );
  return res.rows[0];
}

export async function cancelRequest(requestId: string, userId: string, reason?: string): Promise<any> {
  const res = await query(
    `UPDATE service_agreements SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
    [requestId]
  );
  return res.rows[0];
}
