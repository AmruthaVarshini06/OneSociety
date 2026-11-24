import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface ServiceComplaintDocument {
  id: string;
  _id: string;
  societyId: string;
  filedBy: any;
  againstProviderId: any;
  againstProviderUserId: string;
  requestId?: string;
  agreementId?: string;
  category: string;
  description: string;
  status: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

function mapComplaint(row: any): ServiceComplaintDocument {
  return {
    id: row.id,
    _id: row.id,
    societyId: row.society_id,
    filedBy: row.filed_by_username ? { id: row.filed_by, username: row.filed_by_username, displayName: row.filed_by_username } : row.filed_by,
    againstProviderId: row.provider_name ? { id: row.against_provider_id, name: row.provider_name, displayName: row.provider_name } : row.against_provider_id,
    againstProviderUserId: row.against_provider_user_id,
    requestId: row.request_id,
    agreementId: row.agreement_id,
    category: row.category,
    description: row.description,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function fileComplaint(
  seekerId: string,
  societyId: string,
  providerProfileId: string,
  category: string,
  description: string,
  requestId?: string,
  agreementId?: string,
): Promise<ServiceComplaintDocument> {
  const provRes = await query('SELECT * FROM service_providers WHERE id = $1', [providerProfileId]);
  const profile = provRes.rows[0];
  if (!profile) throw Object.assign(new Error('Provider not found'), { statusCode: 404 });

  const res = await query(
    `INSERT INTO service_complaints (
      society_id, filed_by, against_provider_id, against_provider_user_id,
      request_id, agreement_id, category, description, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
    RETURNING *`,
    [
      societyId,
      seekerId,
      providerProfileId,
      profile.user_id,
      requestId || null,
      agreementId || null,
      category,
      description,
    ]
  );
  const complaint = res.rows[0];

  const presRes = await query('SELECT id FROM users WHERE society_id = $1 AND role = $2 LIMIT 1', [societyId, 'president']);
  const president = presRes.rows[0];
  if (president) {
    await sendNotification(
      president.id.toString(),
      'New service complaint',
      `A complaint has been filed against provider ${profile.name}. Category: ${category}`,
      'SERVICE_COMPLAINT_NEW',
      complaint.id.toString(),
      { complaintId: complaint.id.toString() },
    );
  }

  return mapComplaint(complaint);
}

export async function getAllComplaints(societyId: string, status?: string): Promise<ServiceComplaintDocument[]> {
  let sql = `
    SELECT sc.*, u.username as filed_by_username, sp.name as provider_name
    FROM service_complaints sc
    LEFT JOIN users u ON u.id = sc.filed_by
    LEFT JOIN service_providers sp ON sp.id = sc.against_provider_id
    WHERE sc.society_id = $1
  `;
  const params: any[] = [societyId];
  if (status) {
    params.push(status);
    sql += ` AND sc.status = $2`;
  }
  sql += ` ORDER BY sc.created_at DESC`;

  const res = await query(sql, params);
  return res.rows.map(mapComplaint);
}

export async function resolveComplaint(
  complaintId: string,
  presidentId: string,
  notes: string,
  status: 'RESOLVED' | 'DISMISSED',
): Promise<ServiceComplaintDocument> {
  const res = await query(
    `UPDATE service_complaints
     SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, notes, presidentId, complaintId]
  );
  const complaint = res.rows[0];
  if (!complaint) throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });

  await sendNotification(
    complaint.filed_by.toString(),
    `Complaint ${status.toLowerCase()}`,
    `Your complaint has been ${status.toLowerCase()}. ${notes}`,
    'SERVICE_COMPLAINT_RESOLVED',
    complaintId,
    { complaintId },
  );

  return mapComplaint(complaint);
}
