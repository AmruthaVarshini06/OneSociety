import { query } from '../../../config/supabase';
import { assertGroupOrderTransition } from '../group-order/group-order.service';
import { log } from '../../../shared/audit/audit.service';
import { sendSocietyNotification } from '../../../shared/notifications/notification.service';
import { io } from '../../../config/socket';
import type { SubmitOfferInput, SelectOfferInput } from './offer.schema';

export interface SupplierOfferDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  supplierId: any;
  societyId: string;
  tiers: any[];
  deliveryDays: number;
  note?: string;
  status: string;
  createdAt: Date;
}

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

function mapOffer(row: any): SupplierOfferDocument {
  const tiers = Array.isArray(row.tiers) ? row.tiers : typeof row.tiers === 'string' ? JSON.parse(row.tiers) : [];
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    supplierId: row.supplier_business_name ? {
      id: row.supplier_id,
      _id: row.supplier_id,
      businessName: row.supplier_business_name,
      contactName: row.supplier_contact_name,
      contactPhone: row.supplier_phone,
      gstVerified: !!row.supplier_gst_verified,
    } : row.supplier_id,
    societyId: row.society_id,
    tiers,
    deliveryDays: Number(row.delivery_days || 1),
    note: row.note,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

async function getVerifiedSupplierForUser(userId: string): Promise<string> {
  const res = await query('SELECT id, verification_status, status FROM suppliers WHERE user_id = $1', [userId]);
  const supplier = res.rows[0];
  if (!supplier) throw httpError(404, 'No supplier profile found for your account');
  const status = supplier.verification_status || supplier.status;
  if (status !== 'APPROVED') {
    throw httpError(403, 'Your supplier account must be approved before submitting offers');
  }
  return supplier.id;
}

async function getOrderForOffers(orderId: string, societyId: string) {
  const res = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = res.rows[0];
  if (!order) throw httpError(404, 'Group order not found');
  if (order.status !== 'OFFERS_OPEN') {
    throw httpError(409, `Offers can only be submitted when status is OFFERS_OPEN (current: ${order.status})`);
  }
  return order;
}

export async function submitOffer(
  orderId: string,
  societyId: string,
  userId: string,
  data: SubmitOfferInput,
): Promise<SupplierOfferDocument> {
  const order = await getOrderForOffers(orderId, societyId);
  const supplierId = await getVerifiedSupplierForUser(userId);

  const res = await query(
    `INSERT INTO supplier_offers (group_order_id, supplier_id, society_id, tiers, delivery_days, note, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
     ON CONFLICT (group_order_id, supplier_id)
     DO UPDATE SET tiers = EXCLUDED.tiers, delivery_days = EXCLUDED.delivery_days, note = EXCLUDED.note, status = 'PENDING'
     RETURNING *`,
    [orderId, supplierId, societyId, JSON.stringify(data.tiers), data.deliveryDays, data.note || null]
  );
  const offer = mapOffer(res.rows[0]);

  log(userId, societyId, 'offer.submit', offer.id, 'SupplierOffer', {
    orderId,
    tiersCount: data.tiers.length,
  });

  const productName = order.product_name || order.title || 'Product';
  await sendSocietyNotification(
    societyId,
    `New Offer: ${productName}`,
    `A supplier submitted an offer. Delivery in ${data.deliveryDays} day(s).`,
    'offer.submitted',
  );

  return offer;
}

export async function listOffers(
  orderId: string,
  societyId: string,
): Promise<SupplierOfferDocument[]> {
  const check = await query('SELECT id FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  if (!check.rows[0]) throw httpError(404, 'Group order not found');

  const res = await query(
    `SELECT so.*, s.business_name as supplier_business_name, s.contact_name as supplier_contact_name,
            s.phone as supplier_phone, s.gst_verified as supplier_gst_verified
     FROM supplier_offers so
     LEFT JOIN suppliers s ON s.id = so.supplier_id
     WHERE so.group_order_id = $1
     ORDER BY so.created_at ASC`,
    [orderId]
  );
  return res.rows.map(mapOffer);
}

export async function getMyOffer(
  orderId: string,
  userId: string,
): Promise<SupplierOfferDocument | null> {
  const suppRes = await query('SELECT id FROM suppliers WHERE user_id = $1', [userId]);
  if (!suppRes.rows[0]) throw httpError(404, 'No supplier profile found');

  const res = await query(
    'SELECT * FROM supplier_offers WHERE group_order_id = $1 AND supplier_id = $2',
    [orderId, suppRes.rows[0].id]
  );
  if (!res.rows[0]) return null;
  return mapOffer(res.rows[0]);
}

export async function selectOffer(
  orderId: string,
  offerId: string,
  societyId: string,
  presidentId: string,
  data: SelectOfferInput,
): Promise<{ order: any; offer: SupplierOfferDocument }> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  assertGroupOrderTransition(order.status, 'SUPPLIER_SELECTED');

  const offRes = await query('SELECT * FROM supplier_offers WHERE id = $1 AND group_order_id = $2', [offerId, orderId]);
  const winningOffer = offRes.rows[0];
  if (!winningOffer) throw httpError(404, 'Offer not found');
  if (winningOffer.status !== 'PENDING') {
    throw httpError(409, `Offer is already ${winningOffer.status}`);
  }

  // Update order
  await query(
    `UPDATE group_orders
     SET status = 'SUPPLIER_SELECTED', selected_supplier_id = $1, pricing_tiers = $2
     WHERE id = $3`,
    [winningOffer.supplier_id, winningOffer.tiers, orderId]
  );

  // Accept winner
  await query(`UPDATE supplier_offers SET status = 'ACCEPTED' WHERE id = $1`, [offerId]);

  // Reject others
  await query(`UPDATE supplier_offers SET status = 'REJECTED' WHERE group_order_id = $1 AND id != $2`, [orderId, offerId]);

  log(presidentId, societyId, 'offer.select', offerId, 'SupplierOffer', {
    orderId,
    supplierId: winningOffer.supplier_id.toString(),
  });

  const suppRes = await query('SELECT business_name FROM suppliers WHERE id = $1', [winningOffer.supplier_id]);
  const supplierDoc = suppRes.rows[0];
  const productName = order.product_name || order.title || 'Product';

  await sendSocietyNotification(
    societyId,
    `Supplier Selected: ${productName}`,
    `${supplierDoc?.business_name ?? 'A supplier'} was chosen. Delivery in ${winningOffer.delivery_days} day(s). Payment window opening soon.`,
    'offer.selected',
  );

  io?.to(`society:${societyId}`).emit('grouporder:status_changed', {
    groupOrderId: orderId,
    newStatus: 'SUPPLIER_SELECTED',
    supplierId: winningOffer.supplier_id.toString(),
    tiers: winningOffer.tiers,
  });

  return {
    order: {
      ...order,
      status: 'SUPPLIER_SELECTED',
      supplierId: winningOffer.supplier_id,
      tiers: winningOffer.tiers,
    },
    offer: mapOffer(winningOffer),
  };
}
