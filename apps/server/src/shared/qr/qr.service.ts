import jwt from 'jsonwebtoken';
import { query } from '../../config/supabase';

export type QrTokenType = 'delivery_pass' | 'visitor_pass' | 'resident_pass' | 'family_pass' | 'service_pass';

function getSecret(): string {
  const s = process.env.JWT_ACCESS_SECRET || 'dev_jwt_secret_onesociety_2026';
  return s;
}

export interface QrRecord {
  id: string;
  token: string;
  type: string;
  societyId: string;
  issuedTo?: string;
  visitorName?: string;
  expiresAt: string;
  isSingleUse: boolean;
  usedAt?: string | null;
}

/**
 * Create a signed QR token stored in Supabase PostgreSQL.
 */
export async function createToken(
  type: QrTokenType,
  issuedTo: string,
  societyId: string,
  ttlSeconds: number,
  referenceId?: string,
  isSingleUse = false,
): Promise<string> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const payload = {
    typ: 'qr',
    type,
    issuedTo,
    societyId,
    referenceId: referenceId ?? null,
  };

  const token = jwt.sign(payload, getSecret(), { expiresIn: ttlSeconds });

  await query(
    `INSERT INTO qr_passes (society_id, created_by, pass_type, visitor_name, qr_token, valid_from, valid_until, is_used, status)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, false, 'active')
     ON CONFLICT (qr_token) DO NOTHING`,
    [societyId, issuedTo, type, `Pass for ${type}`, token, expiresAt.toISOString()]
  );

  return token;
}

/**
 * Verify a QR token: check JWT signature, check DB record (not expired, not used if single-use).
 */
export async function verifyToken(token: string): Promise<QrRecord> {
  // 1. Verify JWT signature and expiry
  try {
    jwt.verify(token, getSecret());
  } catch {
    throw Object.assign(new Error('Invalid or expired QR token'), { statusCode: 401 });
  }

  // 2. Look up in DB
  const res = await query(
    `SELECT * FROM qr_passes WHERE qr_token = $1`,
    [token]
  );

  if (res.rows.length === 0) {
    throw Object.assign(new Error('QR token not found'), { statusCode: 404 });
  }

  const record = res.rows[0];

  if (new Date(record.valid_until) < new Date()) {
    throw Object.assign(new Error('QR token expired'), { statusCode: 401 });
  }

  if (record.is_used) {
    throw Object.assign(new Error('QR token already used'), { statusCode: 409 });
  }

  // Mark used
  await query(
    `UPDATE qr_passes SET is_used = true, used_at = NOW(), status = 'used' WHERE id = $1`,
    [record.id]
  );

  return {
    id: record.id,
    token: record.qr_token,
    type: record.pass_type,
    societyId: record.society_id,
    visitorName: record.visitor_name,
    expiresAt: record.valid_until,
    isSingleUse: true,
    usedAt: new Date().toISOString(),
  };
}
