import { query } from '../../../config/supabase';
import { scheduleJob } from '../../../config/agenda';
import { log } from '../../../shared/audit/audit.service';
import { sendSocietyNotification } from '../../../shared/notifications/notification.service';
import type { CreateGroupOrderInput, ListGroupOrdersQuery, CancelGroupOrderInput } from './group-order.schema';
import { io } from '../../../config/socket';

export type GroupOrderStatus =
  | 'DEMAND_OPEN'
  | 'OFFERS_OPEN'
  | 'SUPPLIER_SELECTED'
  | 'GROUP_ORDER_OPEN'
  | 'PAYMENT_WINDOW'
  | 'DELIVERY_PENDING'
  | 'DISPATCHED'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface GroupOrderDocument {
  id: string;
  _id: string;
  societyId: string;
  createdBy: string;
  productName: string;
  productCategory: string;
  description: string;
  productImageUrl?: string;
  unit: string;
  minimumQuantity: number;
  status: GroupOrderStatus;
  demandOpenAt: Date;
  demandCloseAt: Date;
  totalDemandedQuantity: number;
  tiers?: any[];
  supplierId?: any;
  offerId?: any;
  createdAt: Date;
  updatedAt: Date;
}

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

const VALID_TRANSITIONS: Partial<Record<GroupOrderStatus, GroupOrderStatus[]>> = {
  DEMAND_OPEN: ['OFFERS_OPEN', 'CANCELLED'],
  OFFERS_OPEN: ['SUPPLIER_SELECTED', 'CANCELLED'],
  SUPPLIER_SELECTED: ['GROUP_ORDER_OPEN', 'CANCELLED'],
  GROUP_ORDER_OPEN: ['PAYMENT_WINDOW', 'CANCELLED'],
  PAYMENT_WINDOW: ['DELIVERY_PENDING', 'FAILED', 'CANCELLED'],
  DELIVERY_PENDING: ['DISPATCHED', 'DELIVERED'],
  DISPATCHED: ['DELIVERING', 'DELIVERED'],
  DELIVERING: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

export function assertGroupOrderTransition(from: GroupOrderStatus, to: GroupOrderStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw httpError(409, `Cannot transition group order from ${from} to ${to}`);
  }
}

function emitDemandUpdate(societyId: string, groupOrderId: string, totalDemandedQuantity: number, minimumQuantity: number): void {
  if (!io) return;
  io.to(`society:${societyId}`).emit('grouporder:demand_updated', {
    groupOrderId,
    totalDemandedQuantity,
    minimumQuantity,
  });
}

function mapOrder(row: any): GroupOrderDocument {
  const tiers = Array.isArray(row.pricing_tiers) ? row.pricing_tiers : typeof row.pricing_tiers === 'string' ? JSON.parse(row.pricing_tiers) : [];
  return {
    id: row.id,
    _id: row.id,
    societyId: row.society_id,
    createdBy: row.created_by || row.society_id,
    productName: row.title || row.product_name,
    productCategory: row.category || row.product_category,
    description: row.description || '',
    productImageUrl: row.product_image_url,
    unit: row.unit_name || row.unit || 'kg',
    minimumQuantity: Number(row.minimum_quantity || 1),
    status: (row.status || 'DEMAND_OPEN') as GroupOrderStatus,
    demandOpenAt: new Date(row.created_at),
    demandCloseAt: new Date(row.demand_close_at || row.created_at),
    totalDemandedQuantity: Number(row.total_demanded_quantity || 0),
    tiers,
    supplierId: row.selected_supplier_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at),
  };
}

export async function createGroupOrder(
  data: CreateGroupOrderInput,
  presidentId: string,
  societyId: string,
): Promise<GroupOrderDocument> {
  const res = await query(
    `INSERT INTO group_orders (
      society_id, title, category, description, unit_name,
      status, demand_close_at, total_demanded_quantity
    ) VALUES ($1, $2, $3, $4, $5, 'DEMAND_OPEN', $6, 0)
    RETURNING *`,
    [
      societyId,
      data.productName,
      data.productCategory,
      data.description || null,
      data.unit,
      new Date(data.demandCloseAt).toISOString(),
    ]
  );
  const order = mapOrder(res.rows[0]);

  await scheduleJob('group-buy-demand-close', new Date(data.demandCloseAt), {
    groupOrderId: order.id,
    societyId,
  });

  await sendSocietyNotification(
    societyId,
    `New Group Buy: ${data.productName}`,
    `Express your demand by ${new Date(data.demandCloseAt).toLocaleDateString('en-IN')}`,
    'grouporder.demand_open',
  );

  log(presidentId, societyId, 'grouporder.create', order.id, 'GroupOrder', {
    productName: data.productName,
    minimumQuantity: data.minimumQuantity,
  });

  return order;
}

export async function listGroupOrders(
  societyId: string,
  filterQuery: ListGroupOrdersQuery,
): Promise<{ orders: GroupOrderDocument[]; total: number }> {
  let whereClauses = [`society_id = $1`];
  const params: any[] = [societyId];
  let pIdx = 2;

  if (filterQuery.status) {
    whereClauses.push(`status = $${pIdx}`);
    params.push(filterQuery.status);
    pIdx++;
  }

  const whereStr = whereClauses.join(' AND ');
  const page = filterQuery.page || 1;
  const limit = filterQuery.limit || 20;
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int as total FROM group_orders WHERE ${whereStr}`, params);
  const total = countRes.rows[0]?.total || 0;

  const listRes = await query(
    `SELECT * FROM group_orders
     WHERE ${whereStr}
     ORDER BY demand_close_at ASC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, limit, offset]
  );

  return { orders: listRes.rows.map(mapOrder), total };
}

export async function getGroupOrderById(
  orderId: string,
  societyId: string,
): Promise<GroupOrderDocument> {
  const res = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  if (!res.rows[0]) throw httpError(404, 'Group order not found');
  return mapOrder(res.rows[0]);
}

export async function cancelGroupOrder(
  orderId: string,
  presidentId: string,
  societyId: string,
  data: CancelGroupOrderInput,
): Promise<GroupOrderDocument> {
  const check = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = check.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  assertGroupOrderTransition(order.status, 'CANCELLED');
  const res = await query(`UPDATE group_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *`, [orderId]);
  const updated = mapOrder(res.rows[0]);

  await sendSocietyNotification(
    societyId,
    `Group Buy Cancelled: ${updated.productName}`,
    `Reason: ${data.reason}`,
    'grouporder.cancelled',
  );

  log(presidentId, societyId, 'grouporder.cancel', orderId, 'GroupOrder', {
    reason: data.reason,
    previousStatus: order.status,
  });

  return updated;
}

export async function closeDemandWindow(orderId: string): Promise<void> {
  const res = await query(`UPDATE group_orders SET status = 'OFFERS_OPEN' WHERE id = $1 AND status = 'DEMAND_OPEN' RETURNING *`, [orderId]);
  const order = res.rows[0];
  if (!order) return;

  const productName = order.title || order.product_name;
  await sendSocietyNotification(
    order.society_id.toString(),
    `Demand Window Closed: ${productName}`,
    `Total demand: ${order.total_demanded_quantity} ${order.unit_name}. Waiting for supplier offers.`,
    'grouporder.offers_open',
  );

  io?.to(`society:${order.society_id}`).emit('grouporder:status_changed', {
    groupOrderId: orderId,
    newStatus: 'OFFERS_OPEN',
    totalDemandedQuantity: Number(order.total_demanded_quantity),
  });
}

export async function getDemandSummary(
  orderId: string,
  societyId: string,
): Promise<{ items: unknown[]; total: number }> {
  const res = await query(
    `SELECT di.*, f.number as flat_number, u.username as user_username
     FROM demand_items di
     LEFT JOIN flats f ON f.id = di.flat_id
     LEFT JOIN users u ON u.id = di.user_id
     WHERE di.group_order_id = $1
     ORDER BY di.quantity DESC`,
    [orderId]
  );

  const items = res.rows.map((row: any) => ({
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    flatId: { number: row.flat_number, id: row.flat_id },
    userId: { username: row.user_username, id: row.user_id },
    quantityWanted: Number(row.quantity),
  }));

  const total = items.reduce((sum: number, i: any) => sum + i.quantityWanted, 0);
  return { items, total };
}

export { emitDemandUpdate };
