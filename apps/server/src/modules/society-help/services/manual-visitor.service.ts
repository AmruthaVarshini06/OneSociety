import { query } from '../../../config/supabase';
import { isFlatOccupiedNow } from './presence.service';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log as auditLog } from '../../../shared/audit/audit.service';

export type ManualVisitorType = 'VISITOR' | 'DELIVERY';

export interface LogManualVisitorDto {
  visitorType: ManualVisitorType;
  visitorName: string;
  phone?: string;
  vehicleNumber?: string;
  flatCode: string;
  purpose: string;
  deliveryCompany?: string;
  inTime?: Date;
  peopleCount?: number;
  acceptedParcelAtGate?: boolean;
  notes?: string;
}

export async function logManualVisitor(
  societyId: string,
  guardUserId: string,
  dto: LogManualVisitorDto
) {
  const guardRes = await query('SELECT username, full_name FROM users WHERE id = $1', [guardUserId]);
  const guard = guardRes.rows[0];
  const guardName = guard?.full_name || guard?.username || 'Security Guard';

  const flatCode = dto.flatCode.trim();
  const presence = await isFlatOccupiedNow(societyId, flatCode);

  let status: 'ALLOWED' | 'DENIED' = 'ALLOWED';
  let deniedReason: string | undefined;

  // Nobody at home rule enforcement
  if (!presence.isAtHome) {
    if (dto.visitorType === 'VISITOR') {
      status = 'DENIED';
      deniedReason = 'Nobody is at home in this flat. Entry denied.';
    } else if (dto.visitorType === 'DELIVERY') {
      status = 'DENIED';
      deniedReason = dto.acceptedParcelAtGate
        ? 'Nobody at home. Delivery parcel accepted and kept at security gate.'
        : 'Nobody at home. Delivery agent not allowed to flat.';
    }
  }

  const insertRes = await query(
    `INSERT INTO manual_visitor_logs (
      society_id, visitor_type, visitor_name, phone, vehicle_number, 
      flat_code, purpose, delivery_company, in_time, people_count, 
      status, accepted_parcel_at_gate, guard_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      societyId,
      dto.visitorType,
      dto.visitorName.trim(),
      dto.phone?.trim() || null,
      dto.vehicleNumber?.trim() || null,
      flatCode,
      dto.purpose.trim(),
      dto.deliveryCompany?.trim() || null,
      dto.inTime ? dto.inTime.toISOString() : new Date().toISOString(),
      dto.peopleCount || 1,
      status,
      dto.acceptedParcelAtGate || false,
      guardName,
    ]
  );

  const logRecord = insertRes.rows[0];

  // Audit
  auditLog(guardUserId, societyId, 'MANUAL_VISITOR_LOGGED', logRecord.id, 'ManualVisitorLog', {
    flatCode,
    visitorName: dto.visitorName,
    status,
    deniedReason,
  });

  // Notify resident of the flat if present
  const parts = flatCode.split('-');
  let residentRes;
  if (parts.length === 2) {
    residentRes = await query(
      `SELECT u.id as resident_id FROM users u
       JOIN flats f ON u.flat_id = f.id
       JOIN blocks b ON f.block_id = b.id
       WHERE u.society_id = $1 AND b.name ILIKE $2 AND f.flat_number ILIKE $3
       LIMIT 1`,
      [societyId, parts[0], parts[1]]
    );
  } else {
    residentRes = await query(
      `SELECT u.id as resident_id FROM users u
       JOIN flats f ON u.flat_id = f.id
       WHERE u.society_id = $1 AND f.flat_number ILIKE $2
       LIMIT 1`,
      [societyId, flatCode]
    );
  }

  if (residentRes.rows.length > 0) {
    const residentUserId = residentRes.rows[0].resident_id;
    if (status === 'DENIED') {
      await sendNotification(
        residentUserId,
        'Visitor Attempt Denied (Nobody at Home)',
        `A ${dto.visitorType.toLowerCase()} ("${dto.visitorName}"${dto.deliveryCompany ? ` from ${dto.deliveryCompany}` : ''}) came for your flat while nobody was at home. ${deniedReason || ''}`,
        'GATE_VISITOR_DENIED_NOBODY_HOME',
        logRecord.id
      );
    } else {
      await sendNotification(
        residentUserId,
        'Visitor Logged at Gate',
        `${dto.visitorName} (${dto.visitorType.toLowerCase()}${dto.deliveryCompany ? `, ${dto.deliveryCompany}` : ''}) was logged entering for your flat.`,
        'GATE_VISITOR_LOGGED',
        logRecord.id
      );
    }
  }

  return {
    _id: logRecord.id,
    id: logRecord.id,
    visitorType: logRecord.visitor_type,
    visitorName: logRecord.visitor_name,
    phone: logRecord.phone,
    vehicleNumber: logRecord.vehicle_number,
    flatCode: logRecord.flat_code,
    purpose: logRecord.purpose,
    deliveryCompany: logRecord.delivery_company,
    inTime: logRecord.in_time,
    outTime: logRecord.out_time,
    peopleCount: logRecord.people_count,
    status: logRecord.status,
    acceptedParcelAtGate: logRecord.accepted_parcel_at_gate,
    guardName: logRecord.guard_name,
  };
}

export async function markManualVisitorExit(logId: string, societyId: string) {
  const updateRes = await query(
    `UPDATE manual_visitor_logs
     SET out_time = NOW(), status = 'EXITED'
     WHERE id = $1 AND society_id = $2
     RETURNING *`,
    [logId, societyId]
  );

  if (updateRes.rows.length === 0) {
    throw new Error('Visitor log entry not found');
  }

  const logRecord = updateRes.rows[0];
  return {
    _id: logRecord.id,
    id: logRecord.id,
    visitorType: logRecord.visitor_type,
    visitorName: logRecord.visitor_name,
    outTime: logRecord.out_time,
    status: logRecord.status,
  };
}

export async function getCurrentlyInsideManualVisitors(societyId: string) {
  const res = await query(
    `SELECT * FROM manual_visitor_logs
     WHERE society_id = $1 AND status = 'ALLOWED' AND out_time IS NULL
     ORDER BY in_time DESC`,
    [societyId]
  );

  return res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    visitorType: r.visitor_type,
    visitorName: r.visitor_name,
    phone: r.phone,
    vehicleNumber: r.vehicle_number,
    flatCode: r.flat_code,
    purpose: r.purpose,
    deliveryCompany: r.delivery_company,
    inTime: r.in_time,
    outTime: r.out_time,
    peopleCount: r.people_count,
    status: r.status,
    acceptedParcelAtGate: r.accepted_parcel_at_gate,
    guardName: r.guard_name,
  }));
}

export async function recordShiftHandover(
  societyId: string,
  fromGuardId: string,
  dto: { notes: string; toGuardId?: string }
) {
  const guardRes = await query('SELECT username, full_name FROM users WHERE id = $1', [fromGuardId]);
  const guard = guardRes.rows[0];
  const fromGuardName = guard?.full_name || guard?.username || 'Security Guard';

  let toGuardName = 'Next Shift Guard';
  if (dto.toGuardId) {
    const toGRes = await query('SELECT username, full_name FROM users WHERE id = $1', [dto.toGuardId]);
    if (toGRes.rows[0]) {
      toGuardName = toGRes.rows[0].full_name || toGRes.rows[0].username;
    }
  }

  const countRes = await query(
    `SELECT COUNT(*) as count FROM manual_visitor_logs
     WHERE society_id = $1 AND status = 'ALLOWED' AND out_time IS NULL`,
    [societyId]
  );
  const activeInsideCount = parseInt(countRes.rows[0].count, 10);

  return {
    societyId,
    fromGuardId,
    fromGuardName,
    toGuardId: dto.toGuardId,
    toGuardName,
    handoverTime: new Date(),
    notes: dto.notes,
    activeInsideCount,
  };
}
