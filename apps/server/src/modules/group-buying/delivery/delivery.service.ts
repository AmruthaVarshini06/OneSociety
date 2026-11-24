import { query } from '../../../config/supabase';
import { generateQrToken, verifyQrToken } from './token';
import { assertGroupOrderTransition } from '../group-order/group-order.service';
import { log } from '../../../shared/audit/audit.service';
import { sendNotification, sendSocietyNotification } from '../../../shared/notifications/notification.service';
import { io } from '../../../config/socket';
import type { DispatchOrderInput, GateAcceptInput } from './delivery.schema';

export interface DeliveryPassDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  flatId: any;
  societyId: string;
  residentUserId: any;
  commitmentId?: string;
  deliveryType: string;
  qrToken: string;
  items: any[];
  packageCount: number;
  storageLocation: string;
  status: string;
  expiresAt?: Date;
  verifiedAt?: Date;
  otpCode?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
}

export interface DeliveryManifestDocument {
  id: string;
  _id: string;
  groupOrderId: string;
  societyId: string;
  supplierId: any;
  deliveryType: string;
  dispatchedAt: Date;
  promisedDeliveryDate: Date;
  storageLocation: string;
  totalPackagesDeclared: number;
  status: string;
  createdAt: Date;
}

function httpError(status: number, msg: string): Error & { statusCode: number } {
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = status;
  return e;
}

function mapPass(row: any): DeliveryPassDocument {
  const items = Array.isArray(row.items) ? row.items : typeof row.items === 'string' ? JSON.parse(row.items) : [];
  return {
    id: row.id,
    _id: row.id,
    groupOrderId: row.group_order_id,
    flatId: row.flat_number ? { id: row.flat_id, number: row.flat_number } : row.flat_id,
    societyId: row.society_id,
    residentUserId: row.user_username ? { id: row.resident_user_id, username: row.user_username } : row.resident_user_id,
    commitmentId: row.commitment_id,
    deliveryType: row.delivery_type || 'GATE_PICKUP',
    qrToken: row.qr_token,
    items,
    packageCount: Number(row.package_count || 1),
    storageLocation: row.storage_location || 'Society Gate',
    status: row.status,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    otpCode: row.otp_code,
    otpExpiresAt: row.otp_expires_at ? new Date(row.otp_expires_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function dispatchOrder(
  orderId: string,
  userId: string,
  societyId: string,
  data: DispatchOrderInput,
): Promise<{ manifest: DeliveryManifestDocument; passesCreated: number }> {
  const suppRes = await query('SELECT id FROM suppliers WHERE user_id = $1', [userId]);
  const supplier = suppRes.rows[0];
  if (!supplier) throw httpError(404, 'Supplier profile not found');

  const oRes = await query('SELECT * FROM group_orders WHERE id = $1 AND society_id = $2', [orderId, societyId]);
  const order = oRes.rows[0];
  if (!order) throw httpError(404, 'Group order not found');

  if (order.selected_supplier_id && order.selected_supplier_id.toString() !== supplier.id.toString()) {
    throw httpError(403, 'You are not the designated supplier for this group order');
  }

  assertGroupOrderTransition(order.status, 'DISPATCHED');

  const commRes = await query('SELECT * FROM commitments WHERE group_order_id = $1 AND status = \'PAID\'', [orderId]);
  const paidCommitments = commRes.rows;
  if (paidCommitments.length === 0) {
    throw httpError(400, 'Cannot dispatch order with zero paid commitments');
  }

  const mRes = await query(
    `INSERT INTO delivery_manifests (
      group_order_id, society_id, supplier_id, total_items, delivered_items, status
    ) VALUES ($1, $2, $3, $4, 0, 'DISPATCHED')
    RETURNING *`,
    [orderId, societyId, supplier.id, data.totalPackagesDeclared]
  );
  const manifest = mRes.rows[0];

  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  let createdCount = 0;

  const productName = order.title || order.product_name;
  for (const c of paidCommitments) {
    const qrToken = generateQrToken(order.id.toString(), c.flat_id.toString());
    const items = [
      {
        productName,
        quantity: Number(c.quantity),
        unit: order.unit_name || order.unit || 'kg',
      },
    ];

    await query(
      `INSERT INTO delivery_passes (
        group_order_id, flat_id, society_id, resident_user_id, commitment_id,
        delivery_type, qr_token, items, package_count, storage_location, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, 'GENERATED', $10)
      ON CONFLICT (group_order_id, flat_id)
      DO UPDATE SET qr_token = EXCLUDED.qr_token, status = 'GENERATED', expires_at = EXCLUDED.expires_at`,
      [
        orderId,
        c.flat_id,
        societyId,
        c.user_id,
        c.id,
        data.deliveryType,
        qrToken,
        JSON.stringify(items),
        data.storageLocation,
        expiresAt.toISOString(),
      ]
    );
    createdCount++;
  }

  await query(`UPDATE group_orders SET status = 'DISPATCHED' WHERE id = $1`, [orderId]);

  log(userId, societyId, 'ORDER_DISPATCHED', orderId, 'GroupOrder', {
    deliveryType: data.deliveryType,
    storageLocation: data.storageLocation,
    passesCreated: createdCount,
  });

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:status_changed', {
      groupOrderId: orderId,
      status: 'DISPATCHED',
    });
  }

  sendSocietyNotification(
    societyId,
    `Delivery Dispatched: ${productName}`,
    `Delivery expected by ${new Date(data.promisedDeliveryDate).toLocaleDateString()}. Storage: ${data.storageLocation}`,
    'group-buy',
  ).catch((err) => console.error('[NOTIFICATION] dispatchOrder failed:', err));

  return {
    manifest: {
      id: manifest.id,
      _id: manifest.id,
      groupOrderId: manifest.group_order_id,
      societyId: manifest.society_id,
      supplierId: manifest.supplier_id,
      deliveryType: data.deliveryType,
      dispatchedAt: new Date(manifest.created_at),
      promisedDeliveryDate: new Date(data.promisedDeliveryDate),
      storageLocation: data.storageLocation,
      totalPackagesDeclared: data.totalPackagesDeclared,
      status: manifest.status,
      createdAt: new Date(manifest.created_at),
    },
    passesCreated: createdCount,
  };
}

export async function getDeliveryManifest(
  orderId: string,
  societyId: string,
): Promise<{
  manifest: any | null;
  passes: any[];
  stats: { total: number; delivered: number; pending: number };
}> {
  const mRes = await query('SELECT * FROM delivery_manifests WHERE group_order_id = $1 AND society_id = $2', [orderId, societyId]);
  const manifest = mRes.rows[0] || null;

  const pRes = await query(
    `SELECT dp.*, f.number as flat_number, u.username as user_username
     FROM delivery_passes dp
     LEFT JOIN flats f ON f.id = dp.flat_id
     LEFT JOIN users u ON u.id = dp.resident_user_id
     WHERE dp.group_order_id = $1`,
    [orderId]
  );
  const passes = pRes.rows.map(mapPass);

  const total = passes.length;
  const delivered = passes.filter((p) => p.status === 'DELIVERED').length;
  const pending = total - delivered;

  return {
    manifest: manifest ? {
      ...manifest,
      _id: manifest.id,
      groupOrderId: manifest.group_order_id,
      societyId: manifest.society_id,
      supplierId: manifest.supplier_id,
      totalPackagesDeclared: Number(manifest.total_items || 0),
    } : null,
    passes,
    stats: { total, delivered, pending },
  };
}

export async function acceptGateManifest(
  orderId: string,
  guardId: string,
  societyId: string,
  data: GateAcceptInput,
): Promise<{ order: any }> {
  await query(`UPDATE delivery_manifests SET status = 'GATE_ACCEPTED' WHERE group_order_id = $1`, [orderId]);
  await query(`UPDATE group_orders SET status = 'DELIVERING' WHERE id = $1`, [orderId]);

  log(guardId, societyId, 'GATE_MANIFEST_ACCEPTED', orderId, 'GroupOrder', data);

  if (io) {
    io.to(`society:${societyId}`).emit('grouporder:status_changed', {
      groupOrderId: orderId,
      status: 'DELIVERING',
    });
  }

  const oRes = await query('SELECT * FROM group_orders WHERE id = $1', [orderId]);
  const order = oRes.rows[0];
  const productName = order.title || order.product_name;

  sendSocietyNotification(
    societyId,
    `Delivery Arrived: ${productName}`,
    `Packages are at the gate. Show your QR pass to pick up.`,
    'group-buy',
  ).catch((err) => console.error('[NOTIFICATION] acceptGateManifest failed:', err));

  return { order };
}

export async function getGatePickups(
  orderId: string,
  societyId: string,
): Promise<{ passes: DeliveryPassDocument[] }> {
  const pRes = await query(
    `SELECT dp.*, f.number as flat_number, u.username as user_username
     FROM delivery_passes dp
     LEFT JOIN flats f ON f.id = dp.flat_id
     LEFT JOIN users u ON u.id = dp.resident_user_id
     WHERE dp.group_order_id = $1
     ORDER BY dp.created_at ASC`,
    [orderId]
  );
  return { passes: pRes.rows.map(mapPass) };
}

export async function getMyDeliveryPass(
  orderId: string,
  userId: string,
): Promise<DeliveryPassDocument | null> {
  const pRes = await query(
    `SELECT dp.*, f.number as flat_number, u.username as user_username
     FROM delivery_passes dp
     LEFT JOIN flats f ON f.id = dp.flat_id
     LEFT JOIN users u ON u.id = dp.resident_user_id
     WHERE dp.group_order_id = $1 AND dp.resident_user_id = $2`,
    [orderId, userId]
  );
  if (!pRes.rows[0]) return null;
  return mapPass(pRes.rows[0]);
}

export async function verifyDeliveryQr(
  orderId: string,
  qrToken: string,
  guardId: string,
  societyId: string,
): Promise<{ pass: DeliveryPassDocument; allDelivered: boolean }> {
  const verified = verifyQrToken(qrToken);
  if (!verified || verified.groupOrderId !== orderId) {
    throw httpError(400, 'Invalid or expired QR token');
  }

  const pRes = await query(
    `SELECT dp.*, f.number as flat_number, u.username as user_username
     FROM delivery_passes dp
     LEFT JOIN flats f ON f.id = dp.flat_id
     LEFT JOIN users u ON u.id = dp.resident_user_id
     WHERE dp.group_order_id = $1 AND dp.flat_id = $2`,
    [orderId, verified.flatId]
  );
  const pass = pRes.rows[0];
  if (!pass) throw httpError(404, 'Delivery pass not found for flat');
  if (pass.status === 'DELIVERED') throw httpError(400, 'Pass has already been used and delivered');

  const updateRes = await query(
    `UPDATE delivery_passes SET status = 'DELIVERED', verified_at = NOW() WHERE id = $1 RETURNING *`,
    [pass.id]
  );
  const updatedPass = mapPass({ ...pass, ...updateRes.rows[0] });

  const remainingRes = await query(
    `SELECT COUNT(*)::int as remaining FROM delivery_passes WHERE group_order_id = $1 AND status != 'DELIVERED'`,
    [orderId]
  );
  const allDelivered = (remainingRes.rows[0]?.remaining || 0) === 0;

  if (allDelivered) {
    await query(`UPDATE group_orders SET status = 'DELIVERED' WHERE id = $1`, [orderId]);
    if (io) {
      io.to(`society:${societyId}`).emit('grouporder:status_changed', {
        groupOrderId: orderId,
        status: 'DELIVERED',
      });
    }
  }

  log(guardId, societyId, 'DELIVERY_QR_VERIFIED', updatedPass.id, 'DeliveryPass', {
    flatId: verified.flatId,
  });

  return { pass: updatedPass, allDelivered };
}

export async function requestOtpFallback(
  orderId: string,
  userId: string,
  societyId: string,
): Promise<{ message: string }> {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await query(
    `UPDATE delivery_passes
     SET otp_code = $1, otp_expires_at = $2
     WHERE group_order_id = $3 AND resident_user_id = $4`,
    [otpCode, otpExpiresAt.toISOString(), orderId, userId]
  );

  await sendNotification(
    userId,
    'Delivery Pickup OTP',
    `Your delivery OTP is ${otpCode}. It is valid for 10 minutes.`,
    'DELIVERY_OTP',
    orderId
  );

  return { message: 'OTP sent to resident' };
}

export async function verifyOtpFallback(
  orderId: string,
  flatId: string,
  otp: string,
  guardId: string,
  societyId: string,
): Promise<{ pass: DeliveryPassDocument; allDelivered: boolean }> {
  const pRes = await query(
    `SELECT * FROM delivery_passes WHERE group_order_id = $1 AND flat_id = $2`,
    [orderId, flatId]
  );
  const pass = pRes.rows[0];
  if (!pass) throw httpError(404, 'Delivery pass not found');
  if (pass.otp_code !== otp) throw httpError(400, 'Invalid OTP');
  if (pass.otp_expires_at && new Date() > new Date(pass.otp_expires_at)) throw httpError(400, 'OTP expired');

  const updateRes = await query(
    `UPDATE delivery_passes SET status = 'DELIVERED', verified_at = NOW(), otp_code = NULL WHERE id = $1 RETURNING *`,
    [pass.id]
  );
  const updatedPass = mapPass(updateRes.rows[0]);

  const remainingRes = await query(
    `SELECT COUNT(*)::int as remaining FROM delivery_passes WHERE group_order_id = $1 AND status != 'DELIVERED'`,
    [orderId]
  );
  const allDelivered = (remainingRes.rows[0]?.remaining || 0) === 0;

  if (allDelivered) {
    await query(`UPDATE group_orders SET status = 'DELIVERED' WHERE id = $1`, [orderId]);
  }

  return { pass: updatedPass, allDelivered };
}
