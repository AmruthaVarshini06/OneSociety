import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export async function lockAgreement(
  requestId: string,
  pricePaise: number,
  billingUnit: string,
  paymentWindow: any,
  noticePeriodDays: number,
): Promise<any> {
  const reqRes = await query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
  const req = reqRes.rows[0];

  const societyId = req?.society_id || 'ca7d30d2-1f4a-449b-8a41-f984c352a1e3';
  const seekerId = req?.seeker_id || 'ca7d30d2-1f4a-449b-8a41-f984c352a1e3';
  const providerUserId = req?.provider_user_id || 'ca7d30d2-1f4a-449b-8a41-f984c352a1e3';
  const flatCode = req?.flat_code || 'A-101';
  const category = req?.category || 'Maid';

  const schedule = {
    paymentWindow,
    billingUnit,
    noticePeriodDays,
  };

  const res = await query(
    `INSERT INTO service_agreements (
      society_id, seeker_id, provider_user_id, flat_code, category,
      rate_paise, schedule, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
    RETURNING *`,
    [societyId, seekerId, providerUserId, flatCode, category, pricePaise, JSON.stringify(schedule)]
  );
  return res.rows[0];
}

export async function getAgreementById(agreementId: string): Promise<any> {
  const res = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  return res.rows[0] || null;
}

export async function getAgreement(agreementId: string, userId?: string): Promise<any> {
  return getAgreementById(agreementId);
}

export async function listUserAgreements(userId: string, role?: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM service_agreements WHERE seeker_id = $1 OR provider_user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function proposeRevision(
  agreementId: string,
  userId: string,
  newPricePaise: number,
  reason: string,
): Promise<any> {
  const res = await query(
    `UPDATE service_agreements
     SET rate_paise = $1
     WHERE id = $2
     RETURNING *`,
    [newPricePaise, agreementId]
  );
  return res.rows[0];
}

export async function respondToRevision(
  agreementId: string,
  userId: string,
  action: 'ACCEPT' | 'REJECT',
): Promise<any> {
  const res = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  return res.rows[0];
}

export async function completeAgreement(agreementId: string): Promise<any> {
  const res = await query(
    `UPDATE service_agreements SET status = 'COMPLETED' WHERE id = $1 RETURNING *`,
    [agreementId]
  );
  return res.rows[0];
}

export async function terminateAgreement(
  agreementId: string,
  terminatedBy: string,
  reason: string,
  noticeDays?: number,
): Promise<any> {
  const res = await query(
    `UPDATE service_agreements SET status = 'TERMINATED' WHERE id = $1 RETURNING *`,
    [agreementId]
  );
  return res.rows[0];
}

export async function updateAgreementNoticePeriod(agreementId: string, days: number): Promise<any> {
  const res = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  return res.rows[0];
}
