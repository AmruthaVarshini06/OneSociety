import { query } from '../../config/supabase';

type EscrowType = 'HOLD' | 'RELEASE' | 'REFUND' | 'DEDUCT';

interface EscrowParams {
  ownerId: string | any;
  societyId: string | any;
  amountPaise: number;
  purpose: string;
  referenceId?: string | any;
  idempotencyKey: string;
  session?: any;
}

export interface EscrowEntryRow {
  id: string;
  _id: string;
  type: string;
  ownerId: string;
  societyId: string;
  amountPaise: number;
  purpose: string;
  referenceId?: string;
  idempotencyKey: string;
  status: string;
  createdAt: Date;
}

async function createEntry(
  type: EscrowType,
  params: EscrowParams,
): Promise<EscrowEntryRow> {
  const { ownerId, societyId, amountPaise, purpose, referenceId, idempotencyKey } = params;

  if (!Number.isInteger(amountPaise) || amountPaise < 0) {
    throw new Error('amountPaise must be a non-negative integer (paise)');
  }

  // Idempotency: if entry already exists, return it
  const existing = await query('SELECT * FROM escrow_entries WHERE idempotency_key = $1', [idempotencyKey]);
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return {
      id: row.id,
      _id: row.id,
      type: row.type,
      ownerId: row.owner_id,
      societyId: row.society_id,
      amountPaise: Number(row.amount_paise),
      purpose: row.purpose,
      referenceId: row.reference_id,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  const res = await query(
    `INSERT INTO escrow_entries (
      type, owner_id, society_id, amount_paise, purpose, reference_id, idempotency_key, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED')
    RETURNING *`,
    [
      type,
      ownerId ? ownerId.toString() : null,
      societyId ? societyId.toString() : null,
      amountPaise,
      purpose,
      referenceId ? referenceId.toString() : null,
      idempotencyKey,
    ]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    _id: row.id,
    type: row.type,
    ownerId: row.owner_id,
    societyId: row.society_id,
    amountPaise: Number(row.amount_paise),
    purpose: row.purpose,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function hold(params: EscrowParams) {
  return createEntry('HOLD', params);
}

export async function release(params: EscrowParams) {
  return createEntry('RELEASE', params);
}

export async function refund(params: EscrowParams) {
  return createEntry('REFUND', params);
}

export async function deduct(params: EscrowParams) {
  return createEntry('DEDUCT', params);
}

/**
 * Compute the escrow balance for an owner (optionally scoped to a referenceId).
 * Balance = sum(HOLD) - sum(RELEASE + REFUND + DEDUCT)
 * All amounts in paise (integer).
 */
export async function getBalance(
  ownerId: string | any,
  referenceId?: string | any,
): Promise<number> {
  const oId = ownerId ? ownerId.toString() : null;
  let sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'HOLD' THEN amount_paise ELSE 0 END), 0) as holds,
      COALESCE(SUM(CASE WHEN type IN ('RELEASE', 'REFUND', 'DEDUCT') THEN amount_paise ELSE 0 END), 0) as debits
    FROM escrow_entries
    WHERE owner_id = $1 AND status = 'CONFIRMED'
  `;
  const p: any[] = [oId];
  if (referenceId) {
    sql += ` AND reference_id = $2`;
    p.push(referenceId.toString());
  }

  const res = await query(sql, p);
  const row = res.rows[0];
  if (!row) return 0;
  return Number(row.holds) - Number(row.debits);
}
