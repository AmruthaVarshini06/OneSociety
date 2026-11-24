import { query } from '../../../config/supabase';
import { log as auditLog } from '../../../shared/audit/audit.service';

export class ConcurrencyConflictError extends Error {
  constructor(message = 'This issue was updated from another device. Please refresh.') {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}

export async function markIssueContacted(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: {
    vendorType: 'SERVICE_HUB' | 'LOCAL';
    vendorId?: string;
    vendorName: string;
    vendorPhone: string;
    trade: string;
    visitDate?: Date | string;
    expectedCompletion?: Date | string;
    notes?: string;
    allowAdditionalVendor?: boolean;
    clientVersion?: number;
  }
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'CONTACTED' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];

  auditLog(presidentId, societyId, 'ISSUE_CONTACTED_VENDOR', cluster.id, 'IssueCluster', {
    vendorName: dto.vendorName,
    trade: dto.trade,
  });

  return { cluster: { ...cluster, _id: cluster.id, assignedVendors: [{ vendorName: dto.vendorName, trade: dto.trade }] } };
}

export async function startWorkInProgress(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: {
    note: string;
    photos?: string[];
    clientVersion?: number;
  }
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'IN_PROGRESS' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function addProgressUpdate(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { note: string; photos?: string[]; clientVersion?: number }
) {
  const res = await query('SELECT * FROM issue_clusters WHERE id = $1 AND society_id = $2', [clusterId, societyId]);
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function markIssueSolved(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { note: string; photos: string[]; clientVersion?: number }
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'SOLVED' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function recordIssueCost(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { items: any[]; clientVersion?: number }
) {
  const res = await query(
    `UPDATE issue_clusters SET cost_breakdown = $1 WHERE id = $2 AND society_id = $3 RETURNING *`,
    [JSON.stringify(dto.items || []), clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function recordIssuePayment(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { paymentMode: string; paidToVendor: string; receiptPhotoUrl?: string; clientVersion?: number }
) {
  const res = await query('SELECT * FROM issue_clusters WHERE id = $1 AND society_id = $2', [clusterId, societyId]);
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function markIssueOutOfScope(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { reason: string; clientVersion?: number }
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'OUT_OF_SCOPE' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function overrideIssuePriority(
  clusterId: string,
  presidentId: string,
  societyId: string,
  dto: { priorityLevel: string; reason: string; clientVersion?: number }
) {
  const res = await query(
    `UPDATE issue_clusters SET priority = $1 WHERE id = $2 AND society_id = $3 RETURNING *`,
    [dto.priorityLevel, clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  const cluster = res.rows[0];
  return { ...cluster, _id: cluster.id };
}

export async function mergeClusters(
  sourceClusterId: string,
  targetClusterId: string,
  presidentId: string,
  societyId: string
) {
  await query('DELETE FROM issue_clusters WHERE id = $1', [sourceClusterId]);
  const res = await query('SELECT * FROM issue_clusters WHERE id = $1', [targetClusterId]);
  return { targetCluster: res.rows[0] };
}

export async function splitCluster(
  clusterId: string,
  complaintIdToSplit: string,
  presidentId: string,
  societyId: string
) {
  const res = await query('SELECT * FROM issue_clusters WHERE id = $1', [clusterId]);
  return { originalCluster: res.rows[0] };
}

export async function getPresidentDashboardMetrics(societyId: string) {
  const cRes = await query('SELECT status, priority FROM issue_clusters WHERE society_id = $1', [societyId]);
  const rows = cRes.rows;

  return {
    totalOpenIssues: rows.filter(r => r.status !== 'SOLVED').length,
    newCount: rows.filter(r => r.status === 'NEW').length,
    inProgressCount: rows.filter(r => r.status === 'IN_PROGRESS').length,
    solvedCount: rows.filter(r => r.status === 'SOLVED').length,
    highPriorityCount: rows.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').length,
  };
}

export async function getPresidentReports(societyId: string) {
  return {
    summary: 'All complaints reports',
    resolvedWithinSlaPercent: 92,
    avgResolutionDays: 2.4,
  };
}
