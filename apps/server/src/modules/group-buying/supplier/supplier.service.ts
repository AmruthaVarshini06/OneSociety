import argon2 from 'argon2';
import { query } from '../../../config/supabase';
import { validateGst } from '../gst/gst.validator';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log } from '../../../shared/audit/audit.service';
import { sendWhatsApp } from '../../../shared/notifications/adapters/whatsapp.mock';
import type {
  CreateSupplierInput,
  UpdateSupplierProfileInput,
  VerifySupplierInput,
  ListSuppliersQuery,
} from './supplier.schema';

export type VerificationStatus = 'PENDING_REVIEW' | 'GST_VERIFIED' | 'APPROVED' | 'REJECTED';

export interface SupplierDocument {
  id: string;
  _id: string;
  userId: any;
  societyId: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  idDocumentUrl?: string;
  gstNumber?: string;
  gstVerified: boolean;
  verificationStatus: VerificationStatus;
  verifiedBy?: any;
  verificationNote?: string;
  createdAt: Date;
  updatedAt: Date;
  save?: () => Promise<void>;
}

function createHttpError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

function audit(
  actorId: string,
  societyId: string,
  action: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
): void {
  log(actorId, societyId, action, targetId, 'Supplier', metadata);
}

const VALID_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  GST_VERIFIED: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['APPROVED'],
};

function assertTransition(from: VerificationStatus, to: VerificationStatus): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw createHttpError(409, `Cannot transition from ${from} to ${to}`);
  }
}

function mapSupplier(row: any): SupplierDocument {
  return {
    id: row.id,
    _id: row.id,
    userId: row.user_username ? { id: row.user_id, _id: row.user_id, username: row.user_username, preferredLanguage: row.preferred_language || 'en', isActive: row.is_active ?? true } : row.user_id,
    societyId: row.society_id,
    businessName: row.business_name,
    contactName: row.contact_name,
    contactPhone: row.phone || row.contact_phone,
    idDocumentUrl: row.id_document_url,
    gstNumber: row.gst_number || row.gstin,
    gstVerified: !!row.gst_verified,
    verificationStatus: (row.verification_status || row.status || 'PENDING_REVIEW') as VerificationStatus,
    verifiedBy: row.verified_by,
    verificationNote: row.verification_note,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at),
  };
}

export async function createSupplier(
  data: CreateSupplierInput,
  presidentId: string,
  societyId: string,
): Promise<{ supplier: SupplierDocument; gstWarning?: string }> {
  const passwordHash = await argon2.hash(data.tempPassword);

  const userCheck = await query('SELECT id FROM users WHERE username = $1', [data.username.toLowerCase()]);
  if (userCheck.rows[0]) {
    throw createHttpError(409, 'Username already taken');
  }

  const userRes = await query(
    `INSERT INTO users (username, password_hash, role, society_id, must_change_password)
     VALUES ($1, $2, 'supplier', $3, true)
     RETURNING id`,
    [data.username.toLowerCase(), passwordHash, societyId]
  );
  const newUserId = userRes.rows[0].id;

  let gstVerified = false;
  let verificationStatus: VerificationStatus = 'PENDING_REVIEW';
  let gstWarning: string | undefined;

  if (data.gstNumber) {
    const gstResult = validateGst(data.gstNumber);
    if (gstResult.valid) {
      gstVerified = true;
      verificationStatus = 'GST_VERIFIED';
    } else {
      gstWarning = gstResult.reason;
    }
  }

  const suppRes = await query(
    `INSERT INTO suppliers (
      user_id, society_id, business_name, contact_name, phone,
      id_document_url, gstin, gst_number, gst_verified, verification_status, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9)
    RETURNING *`,
    [
      newUserId,
      societyId,
      data.businessName,
      data.contactName,
      data.contactPhone,
      data.idDocumentUrl || null,
      data.gstNumber?.trim().toUpperCase() || null,
      gstVerified,
      verificationStatus,
    ]
  );

  const supplier = mapSupplier(suppRes.rows[0]);

  audit(presidentId, societyId, 'supplier.create', supplier.id, {
    username: data.username,
    gstProvided: !!data.gstNumber,
  });

  sendWhatsApp(
    data.contactPhone,
    `Welcome to OneSociety! Your login: username=${data.username}, password=${data.tempPassword}. Please change your password on first login.`,
  );

  return { supplier, gstWarning };
}

export async function listSuppliers(
  societyId: string,
  filterQuery: ListSuppliersQuery,
): Promise<{ suppliers: SupplierDocument[]; total: number }> {
  let whereClauses = [`s.society_id = $1`];
  const params: any[] = [societyId];
  let pIdx = 2;

  if (filterQuery.status) {
    whereClauses.push(`(s.verification_status = $${pIdx} OR s.status = $${pIdx})`);
    params.push(filterQuery.status);
    pIdx++;
  }

  const whereStr = whereClauses.join(' AND ');
  const page = filterQuery.page || 1;
  const limit = filterQuery.limit || 20;
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int as total FROM suppliers s WHERE ${whereStr}`, params);
  const total = countRes.rows[0]?.total || 0;

  const listRes = await query(
    `SELECT s.*, u.username as user_username, u.preferred_language, u.is_active
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE ${whereStr}
     ORDER BY s.created_at DESC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, limit, offset]
  );

  return { suppliers: listRes.rows.map(mapSupplier), total };
}

export async function getSupplierById(
  supplierId: string,
  requestorId: string,
  societyId: string,
  requestorRole: string,
): Promise<SupplierDocument> {
  const res = await query(
    `SELECT s.*, u.username as user_username, u.preferred_language, u.is_active
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.society_id = $2`,
    [supplierId, societyId]
  );
  if (!res.rows[0]) throw createHttpError(404, 'Supplier not found');

  const supplier = mapSupplier(res.rows[0]);

  if (requestorRole === 'president') {
    audit(requestorId, societyId, 'supplier.view', supplierId, {
      hasIdDocument: !!supplier.idDocumentUrl,
    });
  }

  return supplier;
}

export async function getMySupplierProfile(userId: string): Promise<SupplierDocument> {
  const res = await query(
    `SELECT s.*, u.username as user_username, u.preferred_language, u.is_active
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1`,
    [userId]
  );
  if (!res.rows[0]) throw createHttpError(404, 'Supplier profile not found');
  return mapSupplier(res.rows[0]);
}

export async function updateMyProfile(
  userId: string,
  data: UpdateSupplierProfileInput,
): Promise<{ supplier: SupplierDocument; gstWarning?: string }> {
  const check = await query('SELECT * FROM suppliers WHERE user_id = $1', [userId]);
  if (!check.rows[0]) throw createHttpError(404, 'Supplier profile not found');
  const existing = check.rows[0];

  let gstWarning: string | undefined;
  let gstVerified = existing.gst_verified;
  let verificationStatus = existing.verification_status;
  let gstNumber = existing.gst_number || existing.gstin;

  if (data.gstNumber !== undefined) {
    const gstChanged = data.gstNumber !== gstNumber;
    if (gstChanged) {
      if (verificationStatus === 'APPROVED' || verificationStatus === 'GST_VERIFIED') {
        verificationStatus = 'PENDING_REVIEW';
      }
      const res = validateGst(data.gstNumber);
      if (res.valid) {
        gstVerified = true;
        gstNumber = data.gstNumber.trim().toUpperCase();
        if (verificationStatus === 'PENDING_REVIEW') verificationStatus = 'GST_VERIFIED';
      } else {
        gstVerified = false;
        verificationStatus = 'PENDING_REVIEW';
        gstWarning = res.reason;
      }
    }
  }

  const res = await query(
    `UPDATE suppliers
     SET business_name = COALESCE($1, business_name),
         contact_name = COALESCE($2, contact_name),
         phone = COALESCE($3, phone),
         id_document_url = COALESCE($4, id_document_url),
         gstin = $5,
         gst_number = $5,
         gst_verified = $6,
         verification_status = $7,
         status = $7
     WHERE user_id = $8
     RETURNING *`,
    [
      data.businessName || null,
      data.contactName || null,
      data.contactPhone || null,
      data.idDocumentUrl || null,
      gstNumber,
      gstVerified,
      verificationStatus,
      userId,
    ]
  );

  const supplier = mapSupplier(res.rows[0]);
  audit(userId, supplier.societyId, 'supplier.updateProfile', supplier.id, {
    gstChanged: data.gstNumber !== undefined,
  });

  return { supplier, gstWarning };
}

export async function verifySupplier(
  supplierId: string,
  presidentId: string,
  societyId: string,
  data: VerifySupplierInput,
): Promise<SupplierDocument> {
  const check = await query('SELECT * FROM suppliers WHERE id = $1 AND society_id = $2', [supplierId, societyId]);
  if (!check.rows[0]) throw createHttpError(404, 'Supplier not found');
  const supplier = check.rows[0];

  const targetStatus: VerificationStatus = data.action === 'approve' ? 'APPROVED' : 'REJECTED';
  assertTransition(supplier.verification_status || supplier.status || 'PENDING_REVIEW', targetStatus);

  const res = await query(
    `UPDATE suppliers
     SET verification_status = $1, status = $1, verified_by = $2, verification_note = $3
     WHERE id = $4
     RETURNING *`,
    [targetStatus, presidentId, data.note || null, supplierId]
  );

  const updated = mapSupplier(res.rows[0]);

  if (supplier.user_id) {
    const title = data.action === 'approve' ? 'Account Approved' : 'Account Not Approved';
    const body =
      data.action === 'approve'
        ? 'Your supplier account has been approved. You can now participate in group orders.'
        : `Your supplier account was not approved. Reason: ${data.note ?? 'See admin for details'}`;

    await sendNotification(supplier.user_id.toString(), title, body, 'supplier.verification', supplierId);
  }

  audit(presidentId, societyId, `supplier.${data.action}`, supplierId, {
    status: targetStatus,
    note: data.note,
  });

  return updated;
}
