import { query } from '../../../config/supabase';
import { calculateTieredPrice } from '../pricing/pricing';
import { assertGroupOrderTransition, type GroupOrderDocument } from '../group-order/group-order.service';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payment/razorpay.adapter';
import { hold, refund } from '../../../shared/escrow/escrow.service';
import { scheduleJob } from '../../../config/agenda';
import { log } from '../../../shared/audit/audit.service';
import { sendSocietyNotification } from '../../../shared/notifications/notification.service';
import { io } from '../../../config/socket';
import type { ConfirmPaymentInput } from './commitment.schema';

export interface CommitmentDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  societyId: string;
  flatId: any;
  userId: any;
  quantityWanted: number;
  pricePerUnit: number;
  totalAmountPaise: number;
  status: string;
  escrowEntryId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: Date;
  createdAt: Date;
}

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

function mapCommitment(row: any): CommitmentDocument {
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    societyId: row.society_id,
    flatId: row.flat_number ? { id: row.flat_id, number: row.flat_number, blockName: row.block_name } : row.flat_id,
    userId: row.user_username ? { id: row.user_id, username: row.user_username } : row.user_id,
    quantityWanted: Number(row.quantity),
    pricePerUnit: Number(row.price_per_unit_paise || 0),
    totalAmountPaise: Number(row.total_amount_paise),
    status: row.status,
    escrowEntryId: row.escrow_entry_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function openOrder(
  orderId: string,
  societyId: string,
  presidentId: string,
): Promise<{ order: any; commitmentsCount: number }> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  assertGroupOrderTransition(order.status, 'GROUP_ORDER_OPEN');

  const tiers = Array.isArray(order.pricing_tiers) ? order.pricing_tiers : typeof order.pricing_tiers === 'string' ? JSON.parse(order.pricing_tiers) : [];
  if (!tiers || tiers.length === 0) {
    throw httpError(400, 'Cannot open group order without supplier price tiers');
  }

  const priceResult = calculateTieredPrice(tiers, Number(order.total_demanded_quantity || 0));
  const pricePerUnit = priceResult?.pricePerUnit ?? tiers[0].pricePerUnit;

  const demandsRes = await query('SELECT * FROM demand_items WHERE group_order_id = $1', [orderId]);
  let createdCount = 0;

  for (const d of demandsRes.rows) {
    const qty = Number(d.quantity);
    const totalAmountPaise = qty * pricePerUnit;

    await query(
      `INSERT INTO commitments (
        group_order_id, flat_id, user_id, quantity, total_amount_paise,
        price_per_unit_paise, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      ON CONFLICT (group_order_id, flat_id)
      DO UPDATE SET quantity = EXCLUDED.quantity, total_amount_paise = EXCLUDED.total_amount_paise, price_per_unit_paise = EXCLUDED.price_per_unit_paise`,
      [orderId, d.flat_id, d.user_id, qty, totalAmountPaise, pricePerUnit]
    );
    createdCount++;
  }

  await query(`UPDATE group_orders SET status = 'GROUP_ORDER_OPEN', selected_tier_price_paise = $1 WHERE id = $2`, [pricePerUnit, orderId]);

  log(presidentId, societyId, 'GROUP_ORDER_OPENED', orderId, 'GroupOrder', {
    pricePerUnit,
    commitmentsCreated: createdCount,
  });

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:status_changed', {
      groupOrderId: orderId,
      status: 'GROUP_ORDER_OPEN',
      pricePerUnit,
    });
  }

  const productName = order.title || order.product_name;
  sendSocietyNotification(
    societyId,
    `Group Order Open: ${productName}`,
    `Price locked at ₹${(pricePerUnit / 100).toFixed(2)}/unit. Check your commitment!`,
    'group-buy',
  ).catch((err) => console.error('[NOTIFICATION] openOrder failed:', err));

  return { order: { ...order, status: 'GROUP_ORDER_OPEN' }, commitmentsCount: createdCount };
}

export async function openPaymentWindow(
  orderId: string,
  societyId: string,
  presidentId: string,
  paymentDeadlineHours: number,
): Promise<any> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  assertGroupOrderTransition(order.status, 'PAYMENT_WINDOW');

  const deadline = new Date(Date.now() + paymentDeadlineHours * 3600 * 1000);

  try {
    await scheduleJob('group-buy-payment-close', deadline, {
      groupOrderId: orderId,
      societyId,
    });
  } catch (err) {
    console.error('[AGENDA] Failed to schedule group-buy-payment-close:', err);
  }

  await query(
    `UPDATE group_orders SET status = 'PAYMENT_WINDOW', payment_close_at = $1 WHERE id = $2`,
    [deadline.toISOString(), orderId]
  );

  log(presidentId, societyId, 'PAYMENT_WINDOW_OPENED', orderId, 'GroupOrder', {
    paymentDeadlineAt: deadline,
    paymentDeadlineHours,
  });

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:status_changed', {
      groupOrderId: orderId,
      status: 'PAYMENT_WINDOW',
      paymentDeadlineAt: deadline,
    });
  }

  const productName = order.title || order.product_name;
  sendSocietyNotification(
    societyId,
    `Payment Open: ${productName}`,
    `Please complete payment for your order before ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}`,
    'group-buy',
  ).catch((err) => console.error('[NOTIFICATION] openPaymentWindow failed:', err));

  return { ...order, status: 'PAYMENT_WINDOW', paymentDeadlineAt: deadline };
}

export async function initiatePayment(
  orderId: string,
  userId: string,
  societyId: string,
): Promise<{
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');
  if (order.status !== 'PAYMENT_WINDOW') {
    throw httpError(400, `Payment window is not currently open (status: ${order.status})`);
  }

  const cRes = await query(
    `SELECT * FROM commitments WHERE group_order_id = $1 AND user_id = $2 AND status = 'PENDING'`,
    [orderId, userId]
  );
  const commitment = cRes.rows[0];
  if (!commitment) {
    throw httpError(404, 'No pending commitment found for your account');
  }

  const totalAmountPaise = Number(commitment.total_amount_paise);
  const receipt = `comm_${commitment.id.toString()}`;
  const rzOrder = await createRazorpayOrder(totalAmountPaise, receipt);

  await query('UPDATE commitments SET razorpay_order_id = $1 WHERE id = $2', [rzOrder.id, commitment.id]);

  return {
    razorpayOrderId: rzOrder.id,
    amountPaise: totalAmountPaise,
    currency: rzOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_mock',
  };
}

export async function confirmPayment(
  orderId: string,
  userId: string,
  societyId: string,
  data: ConfirmPaymentInput,
): Promise<CommitmentDocument> {
  const cRes = await query(
    `SELECT * FROM commitments WHERE group_order_id = $1 AND user_id = $2 AND status = 'PENDING'`,
    [orderId, userId]
  );
  const commitment = cRes.rows[0];
  if (!commitment) {
    throw httpError(404, 'No pending commitment found for your account');
  }

  if (commitment.razorpay_order_id && commitment.razorpay_order_id !== data.razorpayOrderId) {
    throw httpError(400, 'Razorpay order ID does not match pending payment');
  }

  const validSignature = verifyRazorpaySignature(
    data.razorpayOrderId,
    data.razorpayPaymentId,
    data.signature,
  );
  if (!validSignature) {
    throw httpError(400, 'Invalid payment signature');
  }

  const totalAmountPaise = Number(commitment.total_amount_paise);

  const escrowEntry = await hold({
    ownerId: userId,
    societyId,
    amountPaise: totalAmountPaise,
    purpose: 'group-buy-payment',
    referenceId: commitment.id,
    idempotencyKey: data.razorpayPaymentId,
  });

  const updateRes = await query(
    `UPDATE commitments
     SET status = 'PAID', escrow_entry_id = $1, razorpay_order_id = $2, razorpay_payment_id = $3, paid_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [escrowEntry.id, data.razorpayOrderId, data.razorpayPaymentId, commitment.id]
  );

  const updated = mapCommitment(updateRes.rows[0]);

  log(userId, societyId, 'COMMITMENT_PAID', updated.id, 'Commitment', {
    amountPaise: totalAmountPaise,
    paymentId: data.razorpayPaymentId,
  });

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:payment_updated', {
      groupOrderId: orderId,
      commitmentId: updated.id,
      status: 'PAID',
    });
  }

  return updated;
}

export async function closePaymentWindow(
  orderId: string,
  societyId: string,
  actorId?: string,
): Promise<any> {
  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  if (order.status !== 'PAYMENT_WINDOW') {
    return order;
  }

  await query(`UPDATE commitments SET status = 'CANCELLED' WHERE group_order_id = $1 AND status = 'PENDING'`, [orderId]);

  const paidRes = await query(`SELECT * FROM commitments WHERE group_order_id = $1 AND status = 'PAID'`, [orderId]);
  const paid = paidRes.rows;
  const totalPaidUnits = paid.reduce((sum: number, c: any) => sum + Number(c.quantity), 0);
  const minQty = Number(order.minimum_quantity || 1);

  let finalStatus: 'DELIVERY_PENDING' | 'FAILED' = 'DELIVERY_PENDING';

  if (totalPaidUnits >= minQty) {
    assertGroupOrderTransition(order.status, 'DELIVERY_PENDING');
    finalStatus = 'DELIVERY_PENDING';
    await query(`UPDATE group_orders SET status = 'DELIVERY_PENDING' WHERE id = $1`, [orderId]);
  } else {
    assertGroupOrderTransition(order.status, 'FAILED');
    finalStatus = 'FAILED';
    await query(`UPDATE group_orders SET status = 'FAILED' WHERE id = $1`, [orderId]);

    for (const c of paid) {
      await refund({
        ownerId: c.user_id,
        societyId,
        amountPaise: Number(c.total_amount_paise),
        purpose: 'group-buy-minimum-not-met',
        referenceId: c.id,
        idempotencyKey: `refund_${c.id.toString()}`,
      });
      await query(`UPDATE commitments SET status = 'REFUNDED' WHERE id = $1`, [c.id]);
    }
  }

  log(actorId ?? 'SYSTEM', societyId, `PAYMENT_WINDOW_CLOSED_${finalStatus}`, orderId, 'GroupOrder', {
    finalStatus,
  });

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:status_changed', {
      groupOrderId: orderId,
      status: finalStatus,
    });
  }

  const productName = order.title || order.product_name;
  const bodyMsg =
    finalStatus === 'DELIVERY_PENDING'
      ? `Payment completed for ${productName}! Supplier preparing delivery.`
      : `Group order for ${productName} did not meet minimum quantity. All payments refunded.`;

  sendSocietyNotification(
    societyId,
    `Order Update: ${productName}`,
    bodyMsg,
    'group-buy',
  ).catch((err) => console.error('[NOTIFICATION] closePaymentWindow failed:', err));

  return { ...order, status: finalStatus };
}

export async function getCommitmentSummary(
  orderId: string,
  societyId: string,
): Promise<{
  counts: { total: number; paid: number; pending: number; cancelled: number; refunded: number };
  totalPaidPaise: number;
  totalPaidUnits: number;
  commitments: Array<{
    _id: string;
    flatNumber: string;
    residentName: string;
    quantityWanted: number;
    pricePerUnit: number;
    totalAmountPaise: number;
    status: string;
    paidAt?: Date;
  }>;
}> {
  const res = await query(
    `SELECT c.*, f.number as flat_number, b.name as block_name, u.username as user_username
     FROM commitments c
     LEFT JOIN flats f ON f.id = c.flat_id
     LEFT JOIN blocks b ON b.id = f.block_id
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.group_order_id = $1`,
    [orderId]
  );

  const commitments = res.rows;
  const counts = { total: 0, paid: 0, pending: 0, cancelled: 0, refunded: 0 };
  let totalPaidPaise = 0;
  let totalPaidUnits = 0;

  const formatted = commitments.map((c: any) => {
    counts.total++;
    const totalAmt = Number(c.total_amount_paise);
    const qty = Number(c.quantity);

    if (c.status === 'PAID') {
      counts.paid++;
      totalPaidPaise += totalAmt;
      totalPaidUnits += qty;
    } else if (c.status === 'PENDING') counts.pending++;
    else if (c.status === 'CANCELLED') counts.cancelled++;
    else if (c.status === 'REFUNDED') counts.refunded++;

    const flatLabel = c.block_name ? `${c.block_name}-${c.flat_number}` : c.flat_number || 'Flat';

    return {
      _id: c.id.toString(),
      flatNumber: flatLabel,
      residentName: c.user_username ?? 'Resident',
      quantityWanted: qty,
      pricePerUnit: Number(c.price_per_unit_paise || 0),
      totalAmountPaise: totalAmt,
      status: c.status,
      paidAt: c.paid_at ? new Date(c.paid_at) : undefined,
    };
  });

  return {
    counts,
    totalPaidPaise,
    totalPaidUnits,
    commitments: formatted,
  };
}

export async function getMyCommitment(
  orderId: string,
  userId: string,
): Promise<CommitmentDocument | null> {
  const res = await query(
    'SELECT * FROM commitments WHERE group_order_id = $1 AND user_id = $2',
    [orderId, userId]
  );
  if (!res.rows[0]) return null;
  return mapCommitment(res.rows[0]);
}
