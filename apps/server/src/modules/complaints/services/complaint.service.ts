import { query } from '../../../config/supabase';
import { checkComplaintScope } from '../ai/scope-checker';
import { analyzeSeverity } from '../ai/severity-analyzer';
import { calculatePriority, type ScopeLevel } from '../ai/priority-scoring';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log as auditLog } from '../../../shared/audit/audit.service';

export interface SubmitComplaintDto {
  societyId: string;
  residentId: string;
  residentFlatCode: string;
  category: string;
  location: {
    block?: string;
    floor?: string;
    specificArea: string;
  };
  description: string;
  photos: string[];
  scopeLevel?: ScopeLevel;
  linkToClusterId?: string;
}

export class ComplaintScopeError extends Error {
  public suggestServiceHub: boolean;
  public serviceHubCategorySlug?: string;
  constructor(message: string, suggestServiceHub = false, serviceHubCategorySlug?: string) {
    super(message);
    this.name = 'ComplaintScopeError';
    this.suggestServiceHub = suggestServiceHub;
    this.serviceHubCategorySlug = serviceHubCategorySlug;
  }
}

export async function getSimilarComplaints(
  societyId: string,
  category: string,
  block: string | undefined,
  specificArea: string,
  description: string
) {
  const res = await query(
    `SELECT * FROM issue_clusters WHERE society_id = $1 AND status IN ('NEW', 'CONTACTED', 'IN_PROGRESS', 'REOPENED')`,
    [societyId]
  );
  return res.rows.map(r => ({
    cluster: {
      _id: r.id,
      clusterNumber: r.id.slice(0, 8),
      title: r.title,
      category: r.category,
      status: r.status,
      reportCount: 1,
      priorityLevel: r.priority || 'MEDIUM',
    },
    similarityScore: r.category === category ? 0.85 : 0.4,
  }));
}

export async function submitComplaint(dto: SubmitComplaintDto): Promise<any> {
  const scopeResult = checkComplaintScope(dto.description, dto.location.specificArea, dto.category);
  if (scopeResult.scopeStatus === 'INTERNAL_FLAT_BLOCKED') {
    throw new ComplaintScopeError(
      scopeResult.message || 'This looks like a problem inside your flat. You can hire a verified provider through ServiceHub.',
      true,
      scopeResult.serviceHubCategorySlug
    );
  }

  const locationStr = `${dto.location.specificArea}${dto.location.block ? ` (${dto.location.block})` : ''}`;
  let clusterId = dto.linkToClusterId;

  if (!clusterId) {
    const clusterTitle = `${dto.category} - ${locationStr}`;
    const cRes = await query(
      `INSERT INTO issue_clusters (society_id, title, category, location, priority, status)
       VALUES ($1, $2, $3, $4, 'HIGH', 'NEW')
       RETURNING *`,
      [dto.societyId, clusterTitle, dto.category, locationStr]
    );
    clusterId = cRes.rows[0].id;
  }

  const compRes = await query(
    `INSERT INTO complaints (society_id, cluster_id, resident_id, flat_code, category, location, description, photos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      dto.societyId,
      clusterId,
      dto.residentId,
      dto.residentFlatCode,
      dto.category,
      locationStr,
      dto.description,
      JSON.stringify(dto.photos || []),
    ]
  );

  const comp = compRes.rows[0];
  const clusterRes = await query('SELECT * FROM issue_clusters WHERE id = $1', [clusterId]);
  const cluster = clusterRes.rows[0];

  auditLog(dto.residentId, dto.societyId, 'COMPLAINT_SUBMITTED', comp.id, 'Complaint', {
    clusterId,
    category: dto.category,
  });

  return {
    complaint: {
      _id: comp.id,
      id: comp.id,
      complaintNumber: comp.id.slice(0, 8),
      category: comp.category,
      description: comp.description,
      photos: comp.photos,
      status: comp.status || 'NEW',
    },
    cluster: {
      _id: cluster.id,
      id: cluster.id,
      clusterNumber: cluster.id.slice(0, 8),
      title: cluster.title,
      status: cluster.status,
      priorityLevel: cluster.priority,
    },
  };
}

export async function getComplaintsFeed(
  societyId: string,
  filters: {
    status?: string;
    category?: string;
    priorityLevel?: string;
    block?: string;
    myComplaintsOnly?: boolean;
    residentId?: string;
    search?: string;
  }
): Promise<any[]> {
  let sql = 'SELECT * FROM issue_clusters WHERE society_id = $1';
  const params: any[] = [societyId];

  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters.category && filters.category !== 'ALL') {
    params.push(filters.category);
    sql += ` AND category = $${params.length}`;
  }

  sql += ' ORDER BY created_at DESC';

  const res = await query(sql, params);
  return res.rows.map(c => ({
    _id: c.id,
    id: c.id,
    clusterNumber: c.id.slice(0, 8),
    title: c.title,
    category: c.category,
    location: { specificArea: c.location },
    status: c.status || 'NEW',
    priorityLevel: c.priority || 'MEDIUM',
    priorityScore: 75,
    reportCount: 1,
    affectedResidentsCount: 1,
    firstReportedAt: c.created_at,
    daysOpen: 1,
    photos: [],
    description: c.title,
    reportersCount: 1,
    assignedVendorsCount: c.assigned_vendor_id ? 1 : 0,
    costsTotalPaise: 0,
    isPaid: false,
  }));
}

export async function getClusterDetails(
  clusterId: string,
  societyId: string,
  isPresident: boolean
): Promise<any> {
  const cRes = await query('SELECT * FROM issue_clusters WHERE id = $1 AND society_id = $2', [clusterId, societyId]);
  if (cRes.rows.length === 0) throw new Error('Issue not found');
  const cluster = cRes.rows[0];

  const compsRes = await query('SELECT * FROM complaints WHERE cluster_id = $1', [clusterId]);

  return {
    _id: cluster.id,
    id: cluster.id,
    clusterNumber: cluster.id.slice(0, 8),
    title: cluster.title,
    category: cluster.category,
    location: { specificArea: cluster.location },
    status: cluster.status,
    priorityLevel: cluster.priority,
    complaintIds: compsRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      description: r.description,
      photos: r.photos,
      flatCode: r.flat_code,
      createdAt: r.created_at,
    })),
    assignedVendors: [],
  };
}

export async function editOwnComplaint(
  complaintId: string,
  residentId: string,
  societyId: string,
  updates: { description?: string; photos?: string[]; specificArea?: string }
) {
  const res = await query(
    `UPDATE complaints
     SET description = COALESCE($1, description), photos = COALESCE($2, photos)
     WHERE id = $3 AND resident_id = $4 AND society_id = $5
     RETURNING *`,
    [updates.description, updates.photos ? JSON.stringify(updates.photos) : null, complaintId, residentId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Complaint not found or not owned by you');
  return res.rows[0];
}

export async function withdrawOwnComplaint(
  complaintId: string,
  residentId: string,
  societyId: string,
  reason?: string
) {
  const res = await query(
    `DELETE FROM complaints WHERE id = $1 AND resident_id = $2 AND society_id = $3 RETURNING *`,
    [complaintId, residentId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Complaint not found or not owned by you');
  return res.rows[0];
}

export async function reopenIssue(
  clusterId: string,
  residentId: string,
  societyId: string,
  residentFlatCode: string,
  reason: string,
  photos: string[]
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'REOPENED' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  return res.rows[0];
}

export async function confirmIssueFixed(
  clusterId: string,
  residentId: string,
  societyId: string,
  residentFlatCode: string
) {
  const res = await query(
    `UPDATE issue_clusters SET status = 'SOLVED' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [clusterId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Issue not found');
  return res.rows[0];
}

export async function hideSpamComplaint(
  complaintId: string,
  presidentId: string,
  societyId: string,
  reason: string
) {
  const res = await query(
    `DELETE FROM complaints WHERE id = $1 AND society_id = $2 RETURNING *`,
    [complaintId, societyId]
  );
  return res.rows[0];
}
