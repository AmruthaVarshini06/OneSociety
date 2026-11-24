import { query } from '../../../config/supabase';
import { verifyPriceWithAi } from '../pricing/price-verifier';
import type {
  CreateItemRequestInput,
  CreateItemOfferInput,
  ListItemRequestsQuery,
} from './item-request.schema';
import * as auditService from '../../../shared/audit/audit.service';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface RentalItemRequestDocument {
  id: string;
  _id: string;
  societyId: string;
  requesterId: any;
  flatId: any;
  itemName: string;
  category: string;
  purpose?: string;
  neededFrom?: Date;
  durationValue: number;
  durationType: string;
  budgetPaise?: number;
  status: string;
  offersCount: number;
  dismissedBy: string[];
  createdAt: Date;
}

export interface RentalItemOfferDocument {
  id: string;
  _id: string;
  requestId: string;
  ownerId: any;
  itemId?: any;
  ratePaise: number;
  depositPaise: number;
  message?: string;
  status: string;
  createdAt: Date;
}

function mapRequest(row: any): RentalItemRequestDocument {
  const dismissed = Array.isArray(row.dismissed_by) ? row.dismissed_by : typeof row.dismissed_by === 'string' ? JSON.parse(row.dismissed_by) : [];
  return {
    id: row.id,
    _id: row.id,
    societyId: row.society_id,
    requesterId: row.requester_username ? { id: row.requester_id, _id: row.requester_id, username: row.requester_username } : row.requester_id,
    flatId: row.flat_number ? { id: row.flat_id, _id: row.flat_id, number: row.flat_number } : row.flat_id,
    itemName: row.name || row.item_name,
    category: row.category,
    purpose: row.purpose || row.description,
    neededFrom: row.needed_from || row.needed_date ? new Date(row.needed_from || row.needed_date) : undefined,
    durationValue: Number(row.duration_value || 1),
    durationType: row.duration_type || 'DAYS',
    budgetPaise: row.budget_paise != null ? Number(row.budget_paise) : undefined,
    status: row.status,
    offersCount: Number(row.offers_count || 0),
    dismissedBy: dismissed,
    createdAt: new Date(row.created_at),
  };
}

function mapOffer(row: any): RentalItemOfferDocument {
  return {
    id: row.id,
    _id: row.id,
    requestId: row.request_id,
    ownerId: row.owner_username ? { id: row.owner_id, _id: row.owner_id, username: row.owner_username } : row.owner_id,
    itemId: row.item_id,
    ratePaise: Number(row.rate_paise || 0),
    depositPaise: Number(row.deposit_paise || 0),
    message: row.message,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export async function createRequest(
  data: CreateItemRequestInput,
  userId: string,
  societyId: string,
): Promise<RentalItemRequestDocument> {
  const uRes = await query('SELECT flat_id FROM users WHERE id = $1', [userId]);
  let flatId = uRes.rows[0]?.flat_id;
  if (!flatId) {
    const fRes = await query('SELECT id FROM flats WHERE society_id = $1 LIMIT 1', [societyId]);
    flatId = fRes.rows[0]?.id;
    if (!flatId) throw new Error('User flat is not associated with this society.');
  }

  const res = await query(
    `INSERT INTO item_requests (
      society_id, requester_id, flat_id, name, category, purpose,
      needed_from, duration_value, duration_type, budget_paise, status, offers_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', 0)
    RETURNING *`,
    [
      societyId,
      userId,
      flatId,
      data.itemName.trim(),
      data.category.toLowerCase().trim(),
      data.purpose?.trim() || null,
      data.neededFrom ? new Date(data.neededFrom).toISOString() : null,
      data.durationValue || 1,
      data.durationType || 'DAYS',
      data.budgetPaise || null,
    ]
  );
  const request = mapRequest(res.rows[0]);

  auditService.log(userId, societyId, 'ITEM_REQUEST_CREATED', request.id, 'RentalItemRequest', {
    itemName: request.itemName,
    category: request.category,
    budgetPaise: request.budgetPaise,
  });

  return request;
}

export async function listRequests(
  societyId: string,
  userIdOrQuery?: any,
  queryOrUser?: any,
) {
  const filterQuery: ListItemRequestsQuery = (typeof userIdOrQuery === 'object' && userIdOrQuery !== null && 'page' in userIdOrQuery)
    ? userIdOrQuery
    : (queryOrUser || {});

  let whereClauses = [`ir.society_id = $1`, `ir.status = 'OPEN'`];
  const params: any[] = [societyId];
  let pIdx = 2;

  if (filterQuery.category) {
    whereClauses.push(`LOWER(ir.category) = $${pIdx}`);
    params.push(filterQuery.category.toLowerCase().trim());
    pIdx++;
  }

  const whereStr = whereClauses.join(' AND ');
  const page = filterQuery.page || 1;
  const limit = filterQuery.limit || 20;
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int as total FROM item_requests ir WHERE ${whereStr}`, params);
  const total = countRes.rows[0]?.total || 0;

  const res = await query(
    `SELECT ir.*, u.username as requester_username, f.number as flat_number
     FROM item_requests ir
     LEFT JOIN users u ON u.id = ir.requester_id
     LEFT JOIN flats f ON f.id = ir.flat_id
     WHERE ${whereStr}
     ORDER BY ir.created_at DESC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    requests: res.rows.map(mapRequest),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMyRequests(userId: string): Promise<RentalItemRequestDocument[]> {
  const res = await query(
    `SELECT ir.*, u.username as requester_username, f.number as flat_number
     FROM item_requests ir
     LEFT JOIN users u ON u.id = ir.requester_id
     LEFT JOIN flats f ON f.id = ir.flat_id
     WHERE ir.requester_id = $1
     ORDER BY ir.created_at DESC`,
    [userId]
  );
  return res.rows.map(mapRequest);
}

export async function getRequestById(
  id: string,
  userIdOrSocietyId?: string,
  societyId?: string,
): Promise<(RentalItemRequestDocument & { offers?: RentalItemOfferDocument[] }) | null> {
  const socId = societyId || (userIdOrSocietyId && userIdOrSocietyId.length === 36 ? userIdOrSocietyId : undefined);
  let sql = `
    SELECT ir.*, u.username as requester_username, f.number as flat_number
    FROM item_requests ir
    LEFT JOIN users u ON u.id = ir.requester_id
    LEFT JOIN flats f ON f.id = ir.flat_id
    WHERE ir.id = $1
  `;
  const params: any[] = [id];
  if (socId) {
    sql += ` AND ir.society_id = $2`;
    params.push(socId);
  }

  const res = await query(sql, params);
  if (!res.rows[0]) return null;

  const reqDoc = mapRequest(res.rows[0]);

  const offersRes = await query(
    `SELECT io.*, u.username as owner_username
     FROM item_offers io
     LEFT JOIN users u ON u.id = io.owner_id
     WHERE io.request_id = $1
     ORDER BY io.created_at ASC`,
    [id]
  );

  return {
    ...reqDoc,
    offers: offersRes.rows.map(mapOffer),
  };
}

export async function dismissRequest(requestId: string, userId: string): Promise<void> {
  await query(
    `UPDATE item_requests
     SET dismissed_by = CASE
       WHEN dismissed_by @> jsonb_build_array($1::text) THEN dismissed_by
       ELSE dismissed_by || jsonb_build_array($1::text)
     END
     WHERE id = $2`,
    [userId, requestId]
  );
}

export async function cancelRequest(requestId: string, userId: string): Promise<void> {
  const check = await query('SELECT * FROM item_requests WHERE id = $1', [requestId]);
  if (!check.rows[0]) throw new Error('Request not found');
  if (check.rows[0].requester_id.toString() !== userId) throw new Error('Not authorized to cancel this request');

  await query(`UPDATE item_requests SET status = 'CANCELLED' WHERE id = $1`, [requestId]);
  await query(`UPDATE item_offers SET status = 'REJECTED' WHERE request_id = $1 AND status = 'PENDING'`, [requestId]);
}

export async function makeOffer(
  requestId: string,
  userId: string,
  societyId: string,
  data: CreateItemOfferInput,
): Promise<RentalItemOfferDocument> {
  const reqRes = await query('SELECT * FROM item_requests WHERE id = $1 AND society_id = $2', [requestId, societyId]);
  const reqRow = reqRes.rows[0];
  if (!reqRow) throw new Error('Item request not found');
  if (reqRow.status !== 'OPEN') throw new Error('Item request is no longer open');
  if (reqRow.requester_id.toString() === userId) throw new Error('Cannot offer to your own request');

  const rate = data.chargeHourlyPaise || data.chargeDailyPaise || 0;
  const deposit = data.safeDepositPaise || 0;

  const res = await query(
    `INSERT INTO item_offers (request_id, owner_id, item_id, rate_paise, deposit_paise, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
     RETURNING *`,
    [
      requestId,
      userId,
      data.existingItemId || null,
      rate,
      deposit,
      data.message || null,
    ]
  );
  const offer = mapOffer(res.rows[0]);

  await query('UPDATE item_requests SET offers_count = offers_count + 1 WHERE id = $1', [requestId]);

  await sendNotification(
    reqRow.requester_id.toString(),
    'New Offer Received!',
    `A neighbour offered their item for your request "${reqRow.name}". Tap to review.`,
    'ITEM_OFFER_RECEIVED',
    requestId,
    { requestId, offerId: offer.id },
  );

  return offer;
}

export async function acceptOffer(
  requestId: string,
  offerId: string,
  userId: string,
  societyId: string,
): Promise<{ offer: RentalItemOfferDocument }> {
  const reqRes = await query('SELECT * FROM item_requests WHERE id = $1 AND society_id = $2', [requestId, societyId]);
  const reqRow = reqRes.rows[0];
  if (!reqRow) throw new Error('Item request not found');
  if (reqRow.requester_id.toString() !== userId) throw new Error('Not authorized to accept offers on this request');

  const offRes = await query('SELECT * FROM item_offers WHERE id = $1 AND request_id = $2', [offerId, requestId]);
  const offerRow = offRes.rows[0];
  if (!offerRow) throw new Error('Offer not found');

  await query(`UPDATE item_offers SET status = 'ACCEPTED' WHERE id = $1`, [offerId]);
  await query(`UPDATE item_offers SET status = 'REJECTED' WHERE request_id = $1 AND id != $2`, [requestId, offerId]);
  await query(`UPDATE item_requests SET status = 'FULFILLED' WHERE id = $1`, [requestId]);

  await sendNotification(
    offerRow.owner_id.toString(),
    'Your Offer Was Accepted!',
    `Your offer for "${reqRow.name}" was accepted! Booking created.`,
    'ITEM_OFFER_ACCEPTED',
    requestId,
  );

  return { offer: mapOffer(offerRow) };
}

export async function withdrawOffer(offerId: string, userId: string): Promise<void> {
  const offRes = await query('SELECT * FROM item_offers WHERE id = $1 AND owner_id = $2', [offerId, userId]);
  if (!offRes.rows[0]) throw new Error('Offer not found or not authorized');

  await query(`UPDATE item_offers SET status = 'WITHDRAWN' WHERE id = $1`, [offerId]);
}
