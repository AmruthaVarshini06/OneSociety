import { query } from '../../../config/supabase';
import { emitDemandUpdate } from '../group-order/group-order.service';
import type { UpsertDemandInput } from './demand.schema';

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

async function assertDemandOpen(orderId: string, societyId: string) {
  const res = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = res.rows[0];
  if (!order) throw httpError(404, 'Group order not found');
  if (order.status !== 'DEMAND_OPEN') {
    throw httpError(409, `Demand window is closed (status: ${order.status})`);
  }
  if (order.demand_close_at && new Date() > new Date(order.demand_close_at)) {
    throw httpError(409, 'Demand window deadline has passed');
  }
  return order;
}

export async function upsertDemand(
  orderId: string,
  societyId: string,
  userId: string,
  flatId: string,
  data: UpsertDemandInput,
): Promise<{ item: any; totalDemandedQuantity: number }> {
  const order = await assertDemandOpen(orderId, societyId);

  const insertRes = await query(
    `INSERT INTO demand_items (group_order_id, flat_id, user_id, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_order_id, flat_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, user_id = EXCLUDED.user_id
     RETURNING *`,
    [orderId, flatId, userId, data.quantityWanted]
  );
  const item = insertRes.rows[0];

  const totalRes = await query(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM demand_items WHERE group_order_id = $1`,
    [orderId]
  );
  const newTotal = Number(totalRes.rows[0]?.total || 0);

  await query('UPDATE group_orders SET total_demanded_quantity = $1 WHERE id = $2', [newTotal, orderId]);

  emitDemandUpdate(societyId, orderId, newTotal, order.minimum_quantity || 1);

  return {
    item: {
      id: item.id,
      _id: item.id,
      groupOrderId: item.group_order_id,
      flatId: item.flat_id,
      userId: item.user_id,
      quantityWanted: Number(item.quantity),
      createdAt: item.created_at,
    },
    totalDemandedQuantity: newTotal,
  };
}

export async function retractDemand(
  orderId: string,
  societyId: string,
  flatId: string,
): Promise<{ totalDemandedQuantity: number }> {
  const order = await assertDemandOpen(orderId, societyId);

  await query('DELETE FROM demand_items WHERE group_order_id = $1 AND flat_id = $2', [orderId, flatId]);

  const totalRes = await query(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM demand_items WHERE group_order_id = $1`,
    [orderId]
  );
  const newTotal = Number(totalRes.rows[0]?.total || 0);

  await query('UPDATE group_orders SET total_demanded_quantity = $1 WHERE id = $2', [newTotal, orderId]);
  emitDemandUpdate(societyId, orderId, newTotal, order.minimum_quantity || 1);

  return { totalDemandedQuantity: newTotal };
}

export async function getMyDemand(
  orderId: string,
  flatId: string,
): Promise<any | null> {
  const res = await query('SELECT * FROM demand_items WHERE group_order_id = $1 AND flat_id = $2', [orderId, flatId]);
  if (!res.rows[0]) return null;
  const item = res.rows[0];
  return {
    id: item.id,
    _id: item.id,
    groupOrderId: item.group_order_id,
    flatId: item.flat_id,
    userId: item.user_id,
    quantityWanted: Number(item.quantity),
    createdAt: item.created_at,
  };
}
