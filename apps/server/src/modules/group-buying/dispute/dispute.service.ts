import { query } from '../../../config/supabase';
import { hold, release, refund } from '../../../shared/escrow/escrow.service';
import { assertGroupOrderTransition } from '../group-order/group-order.service';
import { log } from '../../../shared/audit/audit.service';
import { sendNotification, sendSocietyNotification } from '../../../shared/notifications/notification.service';
import { io } from '../../../config/socket';
import type {
  CreateIssueInput,
  SupplierResponseInput,
  PresidentResolutionInput,
  SubmitRatingInput,
} from './dispute.schema';

export interface GroupBuyIssueDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  societyId: string;
  flatId: any;
  userId: any;
  issueCategory: string;
  description: string;
  evidencePhotos?: string[];
  status: string;
  supplierResponse?: any;
  presidentResolution?: any;
  createdAt: Date;
}

export interface GroupBuyRatingDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  societyId: string;
  userId: any;
  supplierId: any;
  overallRating: number;
  productQualityRating?: number;
  deliveryPunctualityRating?: number;
  comment?: string;
  createdAt: Date;
}

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

function mapIssue(row: any): GroupBuyIssueDocument {
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    societyId: row.society_id,
    flatId: row.flat_id,
    userId: row.user_id,
    issueCategory: row.issue_type,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export async function reportIssue(
  orderId: string,
  userId: string,
  societyId: string,
  data: CreateIssueInput,
): Promise<GroupBuyIssueDocument> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  if (!oRes.rows[0]) throw httpError(404, 'Group order not found');

  const pRes = await query(
    'SELECT * FROM delivery_passes WHERE group_order_id = $1 AND resident_user_id = $2',
    [orderId, userId]
  );
  const pass = pRes.rows[0];
  if (!pass) throw httpError(404, 'No delivery pass found for your account');
  if (pass.status !== 'DELIVERED') {
    throw httpError(400, 'Issues can only be reported after delivery confirmation');
  }

  const res = await query(
    `INSERT INTO group_buy_issues (group_order_id, flat_id, user_id, society_id, issue_type, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')
     RETURNING *`,
    [orderId, pass.flat_id, userId, societyId, data.issueType, data.description]
  );
  const issue = mapIssue(res.rows[0]);

  log(userId, societyId, 'ISSUE_REPORTED', issue.id, 'GroupBuyIssue', {
    category: data.issueType,
  });

  return issue;
}

export async function listIssues(
  orderId: string,
  societyId: string,
  role?: string,
  userId?: string,
): Promise<{ issues: GroupBuyIssueDocument[] }> {
  let q = `SELECT * FROM group_buy_issues WHERE group_order_id = $1 AND society_id = $2`;
  const params: any[] = [orderId, societyId];
  if (role === 'RESIDENT' && userId) {
    q += ` AND user_id = $3`;
    params.push(userId);
  }
  q += ` ORDER BY created_at DESC`;
  const res = await query(q, params);
  return { issues: res.rows.map(mapIssue) };
}

export async function supplierRespondIssue(
  issueId: string,
  supplierUserId: string,
  societyId: string,
  data: SupplierResponseInput,
): Promise<GroupBuyIssueDocument> {
  const updateRes = await query(
    `UPDATE group_buy_issues SET status = $1, resolution = $2 WHERE id = $3 RETURNING *`,
    [data.action === 'REFUND' ? 'RESOLVED' : 'DISPUTED', data.note || '', issueId]
  );
  if (!updateRes.rows[0]) throw httpError(404, 'Issue not found');
  return mapIssue(updateRes.rows[0]);
}

export async function escalateIssue(
  issueId: string,
  userId: string,
  societyId: string,
): Promise<GroupBuyIssueDocument> {
  const updateRes = await query(
    `UPDATE group_buy_issues SET status = 'ESCALATED' WHERE id = $1 RETURNING *`,
    [issueId]
  );
  if (!updateRes.rows[0]) throw httpError(404, 'Issue not found');
  return mapIssue(updateRes.rows[0]);
}

export async function presidentResolveIssue(
  issueId: string,
  presidentId: string,
  societyId: string,
  data: PresidentResolutionInput,
): Promise<GroupBuyIssueDocument> {
  const updateRes = await query(
    `UPDATE group_buy_issues SET status = 'RESOLVED', resolution = $1 WHERE id = $2 RETURNING *`,
    [data.note || data.decision, issueId]
  );
  if (!updateRes.rows[0]) throw httpError(404, 'Issue not found');
  return mapIssue(updateRes.rows[0]);
}

export async function submitRating(
  orderId: string,
  userId: string,
  societyId: string,
  data: SubmitRatingInput,
): Promise<GroupBuyRatingDocument> {
  const oRes = await query('SELECT selected_supplier_id FROM group_orders WHERE id = $1', [orderId]);
  const supplierId = oRes.rows[0]?.selected_supplier_id || null;

  const res = await query(
    `INSERT INTO group_buy_ratings (group_order_id, user_id, supplier_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orderId, userId, supplierId, data.productRating, data.productComment || data.supplierComment || null]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    societyId,
    userId: row.user_id,
    supplierId: row.supplier_id,
    overallRating: Number(row.rating),
    comment: row.comment,
    createdAt: new Date(row.created_at),
  };
}

export async function getMyRating(
  orderId: string,
  userId: string,
): Promise<GroupBuyRatingDocument | null> {
  const res = await query('SELECT * FROM group_buy_ratings WHERE group_order_id = $1 AND user_id = $2', [orderId, userId]);
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    societyId: '',
    userId: row.user_id,
    supplierId: row.supplier_id,
    overallRating: Number(row.rating),
    comment: row.comment,
    createdAt: new Date(row.created_at),
  };
}

export async function settleOrderEscrow(
  orderId: string,
  presidentId: string,
  societyId: string,
): Promise<{ releasedPaise: number; refundedPaise: number }> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  assertGroupOrderTransition(order.status, 'COMPLETED');
  await query(`UPDATE group_orders SET status = 'COMPLETED' WHERE id = $1`, [orderId]);

  return { releasedPaise: 0, refundedPaise: 0 };
}
