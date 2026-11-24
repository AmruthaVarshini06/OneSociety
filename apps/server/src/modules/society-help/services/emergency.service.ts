import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { io } from '../../../config/socket';

export async function triggerEmergencyAlert(params: {
  societyId: string;
  residentUserId: string;
  flatCode: string;
  block: string;
  notes?: string;
}): Promise<any> {
  const insertRes = await query(
    `INSERT INTO emergency_alerts (
      society_id, resident_id, flat_code, block, status, triggered_at, notes
    ) VALUES ($1, $2, $3, $4, 'TRIGGERED', NOW(), $5)
    RETURNING *`,
    [params.societyId, params.residentUserId, params.flatCode, params.block, params.notes || null]
  );

  const alert = insertRes.rows[0];

  // Notify Guards and President
  const respondersRes = await query(
    `SELECT id, username, role FROM users WHERE society_id = $1 AND role IN ('guard', 'president')`,
    [params.societyId]
  );

  const title = `🚨 EMERGENCY ALERT: Flat ${params.flatCode} (Block ${params.block})`;
  const body = `Emergency SOS triggered from Flat ${params.flatCode}. Immediate response required!`;

  for (const responder of respondersRes.rows) {
    await sendNotification(
      responder.id,
      title,
      body,
      'EMERGENCY_ALERT',
      alert.id,
      {
        alertId: alert.id,
        flatCode: params.flatCode,
        block: params.block,
        status: 'TRIGGERED',
        isEmergency: true,
      }
    );
  }

  // Real-time broadcast
  if (io) {
    io.to(`society:${params.societyId}`).emit('emergency:triggered', {
      alertId: alert.id,
      flatCode: params.flatCode,
      block: params.block,
      triggeredAt: alert.triggered_at,
    });
  }

  return {
    _id: alert.id,
    id: alert.id,
    societyId: alert.society_id,
    residentUserId: alert.resident_id,
    flatCode: alert.flat_code,
    block: alert.block,
    status: alert.status,
    triggeredAt: alert.triggered_at,
    notes: alert.notes,
  };
}

export async function acknowledgeEmergencyAlert(params: {
  alertId: string;
  guardUserId: string;
  guardName: string;
  notes?: string;
}): Promise<any> {
  const alertRes = await query('SELECT * FROM emergency_alerts WHERE id = $1', [params.alertId]);
  if (alertRes.rows.length === 0) {
    throw new Error('Emergency alert not found');
  }

  const alert = alertRes.rows[0];
  if (alert.status === 'CANCELLED') {
    throw new Error('This emergency alert was already cancelled by the resident');
  }

  const updateRes = await query(
    `UPDATE emergency_alerts
     SET status = 'ACKNOWLEDGED', acknowledged_by_guard_id = $1, acknowledged_by_guard_name = $2, acknowledged_at = NOW(), notes = COALESCE($3, notes)
     WHERE id = $4
     RETURNING *`,
    [params.guardUserId, params.guardName, params.notes || null, params.alertId]
  );

  const updated = updateRes.rows[0];

  // Notify resident
  await sendNotification(
    updated.resident_id,
    '🛡️ Guard is on the way!',
    `Security guard ${params.guardName} has acknowledged your emergency and is heading to Flat ${updated.flat_code}.`,
    'EMERGENCY_ACKNOWLEDGED',
    updated.id,
    {
      alertId: updated.id,
      guardName: params.guardName,
      status: 'ACKNOWLEDGED',
    }
  );

  if (io) {
    io.to(`society:${updated.society_id}`).emit('emergency:acknowledged', {
      alertId: updated.id,
      guardName: params.guardName,
      acknowledgedAt: updated.acknowledged_at,
      status: 'ACKNOWLEDGED',
    });
  }

  return {
    _id: updated.id,
    id: updated.id,
    status: updated.status,
    acknowledgedByGuardName: updated.acknowledged_by_guard_name,
    acknowledgedAt: updated.acknowledged_at,
  };
}

export async function cancelEmergencyAlert(params: {
  alertId: string;
  residentUserId: string;
  reason?: string;
}): Promise<any> {
  const alertRes = await query('SELECT * FROM emergency_alerts WHERE id = $1', [params.alertId]);
  if (alertRes.rows.length === 0) {
    throw new Error('Emergency alert not found');
  }

  const alert = alertRes.rows[0];
  if (alert.resident_id !== params.residentUserId) {
    throw new Error('Only the resident who triggered this alert can cancel it');
  }

  const updateRes = await query(
    `UPDATE emergency_alerts
     SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = $1
     WHERE id = $2
     RETURNING *`,
    [params.reason || 'Resident cancelled alert', params.alertId]
  );

  const updated = updateRes.rows[0];

  if (io) {
    io.to(`society:${updated.society_id}`).emit('emergency:cancelled', {
      alertId: updated.id,
      cancelledAt: updated.cancelled_at,
      cancelReason: updated.cancel_reason,
    });
  }

  return {
    _id: updated.id,
    id: updated.id,
    status: updated.status,
    cancelledAt: updated.cancelled_at,
    cancelReason: updated.cancel_reason,
  };
}

export async function getActiveEmergencyAlerts(societyId: string): Promise<any[]> {
  const res = await query(
    `SELECT * FROM emergency_alerts 
     WHERE society_id = $1 AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
     ORDER BY triggered_at DESC`,
    [societyId]
  );
  return res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    societyId: r.society_id,
    residentUserId: r.resident_id,
    flatCode: r.flat_code,
    block: r.block,
    status: r.status,
    triggeredAt: r.triggered_at,
    acknowledgedByGuardName: r.acknowledged_by_guard_name,
    acknowledgedAt: r.acknowledged_at,
    notes: r.notes,
  }));
}

export async function getEmergencyAlertHistory(societyId: string, limit = 20): Promise<any[]> {
  const res = await query(
    `SELECT * FROM emergency_alerts 
     WHERE society_id = $1
     ORDER BY triggered_at DESC
     LIMIT $2`,
    [societyId, limit]
  );
  return res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    societyId: r.society_id,
    residentUserId: r.resident_id,
    flatCode: r.flat_code,
    block: r.block,
    status: r.status,
    triggeredAt: r.triggered_at,
    acknowledgedByGuardName: r.acknowledged_by_guard_name,
    acknowledgedAt: r.acknowledged_at,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    notes: r.notes,
  }));
}
