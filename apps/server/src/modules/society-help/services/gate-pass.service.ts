import crypto from 'crypto';
import { query } from '../../../config/supabase';
import { isFlatOccupiedNow } from './presence.service';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log as auditLog } from '../../../shared/audit/audit.service';

export class GuardPassCreationForbiddenError extends Error {
  constructor(message = 'Security guards are not allowed to create visitor passes. Only residents can issue passes.') {
    super(message);
    this.name = 'GuardPassCreationForbiddenError';
  }
}

async function generatePassCode(societyId: string): Promise<string> {
  const countRes = await query('SELECT COUNT(*) as count FROM qr_passes WHERE society_id = $1', [societyId]);
  const count = parseInt(countRes.rows[0].count, 10);
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PASS-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;
}

function mapPass(row: any): any {
  if (!row) return {};
  return {
    _id: row.id,
    id: row.id,
    societyId: row.society_id,
    passType: row.pass_type,
    passCode: row.pass_code,
    ownerName: row.owner_name,
    flatCode: row.flat_code,
    visitorName: row.visitor_name,
    visitorPhone: row.visitor_phone,
    purpose: row.purpose,
    expectedPeople: row.expected_people,
    peopleCurrentlyInside: row.people_currently_inside,
    peopleEnteredTotal: row.people_entered_total,
    peopleExitedTotal: row.people_exited_total,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    serviceCategory: row.service_category,
    createdAt: row.created_at,
  };
}

export async function getOrCreateFamilyPass(
  societyId: string,
  residentUserId: string,
  flatId: string,
  flatCode: string,
  ownerName: string
) {
  const existing = await query(
    `SELECT * FROM qr_passes WHERE society_id = $1 AND flat_code = $2 AND pass_type = 'FAMILY' AND status = 'ACTIVE' LIMIT 1`,
    [societyId, flatCode]
  );

  if (existing.rows.length > 0) {
    return mapPass(existing.rows[0]);
  }

  const passCode = await generatePassCode(societyId);
  const res = await query(
    `INSERT INTO qr_passes (
      society_id, pass_type, pass_code, owner_name, flat_code,
      valid_from, valid_until, status, expected_people
    ) VALUES ($1, 'FAMILY', $2, $3, $4, '2026-01-01', '2030-12-31', 'ACTIVE', 6)
    RETURNING *`,
    [societyId, passCode, `${ownerName} Family`, flatCode]
  );

  return mapPass(res.rows[0]);
}

export async function getOrCreatePresidentPass(
  societyId: string,
  presidentUserId: string,
  ownerName: string
) {
  const existing = await query(
    `SELECT * FROM qr_passes WHERE society_id = $1 AND pass_type = 'PRESIDENT' AND status = 'ACTIVE' LIMIT 1`,
    [societyId]
  );

  if (existing.rows.length > 0) {
    return mapPass(existing.rows[0]);
  }

  const passCode = await generatePassCode(societyId);
  const res = await query(
    `INSERT INTO qr_passes (
      society_id, pass_type, pass_code, owner_name,
      valid_from, valid_until, status, expected_people
    ) VALUES ($1, 'PRESIDENT', $2, $3, '2026-01-01', '2030-12-31', 'ACTIVE', 1)
    RETURNING *`,
    [societyId, passCode, `${ownerName} (President)`]
  );

  return mapPass(res.rows[0]);
}

export async function getOrCreateProviderPass(
  societyId: string,
  providerUserId: string
) {
  const profileRes = await query('SELECT * FROM service_providers WHERE user_id = $1 LIMIT 1', [providerUserId]);
  const profile = profileRes.rows[0];
  const ownerName = profile?.name || 'Service Provider';
  const category = profile?.category || 'Service Provider';

  const existing = await query(
    `SELECT * FROM qr_passes WHERE society_id = $1 AND owner_name = $2 AND pass_type = 'SERVICE_PROVIDER' AND status = 'ACTIVE' LIMIT 1`,
    [societyId, ownerName]
  );

  if (existing.rows.length > 0) {
    return mapPass(existing.rows[0]);
  }

  const passCode = await generatePassCode(societyId);
  const res = await query(
    `INSERT INTO qr_passes (
      society_id, pass_type, pass_code, owner_name, service_category,
      valid_from, valid_until, status, expected_people
    ) VALUES ($1, 'SERVICE_PROVIDER', $2, $3, $4, '2026-01-01', '2030-12-31', 'ACTIVE', 1)
    RETURNING *`,
    [societyId, passCode, ownerName, category]
  );

  return mapPass(res.rows[0]);
}

export async function createVisitorPass(
  societyId: string,
  requesterUser: { userId: string; role: string },
  flatCode: string,
  dto: {
    visitorName: string;
    visitorPhone?: string;
    purpose: string;
    expectedPeople?: number;
    validFrom: Date | string;
    validUntil: Date | string;
  }
) {
  if (requesterUser.role === 'guard') {
    throw new GuardPassCreationForbiddenError();
  }

  const passCode = await generatePassCode(societyId);
  const userRes = await query('SELECT username, full_name FROM users WHERE id = $1', [requesterUser.userId]);
  const resident = userRes.rows[0];
  const ownerName = resident?.full_name || resident?.username || 'Resident';

  const validFromIso = new Date(dto.validFrom).toISOString();
  const validUntilIso = new Date(dto.validUntil).toISOString();

  const res = await query(
    `INSERT INTO qr_passes (
      society_id, pass_type, pass_code, owner_name, flat_code,
      visitor_name, visitor_phone, purpose, expected_people,
      valid_from, valid_until, status
    ) VALUES ($1, 'VISITOR', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
    RETURNING *`,
    [
      societyId,
      passCode,
      ownerName,
      flatCode,
      dto.visitorName,
      dto.visitorPhone || null,
      dto.purpose,
      dto.expectedPeople || 1,
      validFromIso,
      validUntilIso,
    ]
  );

  const pass = mapPass(res.rows[0]);
  auditLog(requesterUser.userId, societyId, 'VISITOR_PASS_CREATED', pass._id, 'QrPass', {
    passCode,
    visitorName: dto.visitorName,
    flatCode,
  });

  return pass;
}

export async function revokePass(passId: string, userId: string, societyId: string, reason?: string) {
  const res = await query(
    `UPDATE qr_passes SET status = 'REVOKED' WHERE id = $1 AND society_id = $2 RETURNING *`,
    [passId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Pass not found');

  const pass = mapPass(res.rows[0]);
  auditLog(userId, societyId, 'PASS_REVOKED', pass._id, 'QrPass', { passCode: pass.passCode, reason });
  return pass;
}

export async function scanPassByGuard(
  passCode: string,
  guardUserId: string,
  societyId: string
) {
  const res = await query(
    `SELECT * FROM qr_passes WHERE pass_code = $1 AND society_id = $2`,
    [passCode.trim(), societyId]
  );

  if (res.rows.length === 0) {
    throw new Error('Invalid QR Pass code.');
  }

  const pass = mapPass(res.rows[0]);
  const now = new Date();
  const isExpired = new Date(pass.validUntil) < now || pass.status === 'EXPIRED';
  const isRevoked = pass.status === 'REVOKED';

  if (isRevoked) {
    throw new Error('This pass was REVOKED. Entry denied.');
  }

  let isNobodyAtHome = false;
  let isProviderWarning = false;
  let activeEventTitle: string | undefined;

  if (pass.flatCode) {
    const presence = await isFlatOccupiedNow(societyId, pass.flatCode);
    activeEventTitle = presence.activeEventTitle;

    if (!presence.isAtHome) {
      if (pass.passType === 'VISITOR') {
        isNobodyAtHome = true;
      } else if (pass.passType === 'SERVICE_PROVIDER') {
        isProviderWarning = true;
      }
    }
  }

  const suggestedDirection: 'ENTRY' | 'EXIT' = pass.peopleCurrentlyInside > 0 ? 'EXIT' : 'ENTRY';

  return {
    pass,
    isExpired,
    isRevoked,
    isNobodyAtHome,
    isProviderWarning,
    activeEventTitle,
    suggestedDirection,
  };
}

export async function confirmPassScan(
  passId: string,
  guardUserId: string,
  societyId: string,
  direction: 'ENTRY' | 'EXIT',
  count: number,
  guardNotes?: string
) {
  if (count < 1) {
    throw new Error('Count must be at least 1 person.');
  }

  const passRes = await query('SELECT * FROM qr_passes WHERE id = $1 AND society_id = $2', [passId, societyId]);
  if (passRes.rows.length === 0) throw new Error('Pass not found');
  const pass = mapPass(passRes.rows[0]);

  if (pass.status === 'REVOKED') {
    throw new Error('Cannot confirm scan on a revoked pass.');
  }

  const now = new Date();
  if (new Date(pass.validUntil) < now && direction === 'ENTRY') {
    throw new Error('This pass has expired. Entry cannot be confirmed.');
  }

  if (pass.flatCode && direction === 'ENTRY' && pass.passType === 'VISITOR') {
    const presence = await isFlatOccupiedNow(societyId, pass.flatCode);
    if (!presence.isAtHome) {
      auditLog(guardUserId, societyId, 'VISITOR_ENTRY_DENIED_NOBODY_HOME', pass._id, 'QrPass', {
        flatCode: pass.flatCode,
        visitorName: pass.visitorName,
      });

      throw new Error(`Nobody is at home in Flat ${pass.flatCode}. Entry is blocked.`);
    }
  }

  if (direction === 'EXIT' && count > pass.peopleCurrentlyInside) {
    throw new Error(
      `Exit count (${count}) cannot be more than the number of people currently inside on this pass (${pass.peopleCurrentlyInside}).`
    );
  }

  let newInside = pass.peopleCurrentlyInside;
  let newEntered = pass.peopleEnteredTotal;
  let newExited = pass.peopleExitedTotal;

  if (direction === 'ENTRY') {
    newEntered += count;
    newInside += count;
  } else {
    newExited += count;
    newInside = Math.max(0, newInside - count);
  }

  await query(
    `UPDATE qr_passes 
     SET people_currently_inside = $1, people_entered_total = $2, people_exited_total = $3
     WHERE id = $4`,
    [newInside, newEntered, newExited, passId]
  );

  const guardRes = await query('SELECT username, full_name FROM users WHERE id = $1', [guardUserId]);
  const guard = guardRes.rows[0];
  const guardName = guard?.full_name || guard?.username || 'Security Guard';

  const eventRes = await query(
    `INSERT INTO gate_events (
      society_id, pass_id, pass_code, pass_type, direction, count, guard_name, flat_code, owner_name, scanned_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *`,
    [
      societyId,
      passId,
      pass.passCode,
      pass.passType,
      direction,
      count,
      guardName,
      pass.flatCode,
      pass.visitorName || pass.ownerName,
    ]
  );

  const event = eventRes.rows[0];
  const summary = `${newEntered} entered, ${newExited} exited, ${newInside} inside`;

  return {
    gateEvent: event,
    pass: { ...pass, peopleCurrentlyInside: newInside, peopleEnteredTotal: newEntered, peopleExitedTotal: newExited },
    summary,
  };
}

export async function getLiveGateDashboard(societyId: string) {
  const activePassesRes = await query(
    `SELECT * FROM qr_passes WHERE society_id = $1 AND people_currently_inside > 0`,
    [societyId]
  );
  const activePasses = activePassesRes.rows.map(mapPass);

  let residentsInside = 0;
  let visitorsInside = 0;
  let providersInside = 0;

  for (const p of activePasses) {
    if (p.passType === 'FAMILY' || p.passType === 'PRESIDENT') {
      residentsInside += p.peopleCurrentlyInside;
    } else if (p.passType === 'VISITOR' || p.passType === 'EVENT_GUEST') {
      visitorsInside += p.peopleCurrentlyInside;
    } else if (p.passType === 'SERVICE_PROVIDER') {
      providersInside += p.peopleCurrentlyInside;
    }
  }

  const manualInsideRes = await query(
    `SELECT * FROM manual_visitor_logs WHERE society_id = $1 AND status = 'ALLOWED' AND out_time IS NULL`,
    [societyId]
  );

  let deliveryInside = 0;
  for (const m of manualInsideRes.rows) {
    if (m.visitor_type === 'DELIVERY') {
      deliveryInside += m.people_count;
    } else {
      visitorsInside += m.people_count;
    }
  }

  const totalPeopleInside = residentsInside + visitorsInside + providersInside + deliveryInside;

  const recentEventsRes = await query(
    `SELECT * FROM gate_events WHERE society_id = $1 ORDER BY scanned_at DESC LIMIT 50`,
    [societyId]
  );

  const now = new Date();
  const expiredPassesInside = activePasses.filter(
    p => (p.passType === 'VISITOR' || p.passType === 'EVENT_GUEST') && new Date(p.validUntil) < now
  );

  return {
    totalPeopleInside,
    breakdown: {
      residentsInside,
      visitorsInside,
      providersInside,
      deliveryInside,
    },
    activePassesInsideCount: activePasses.length,
    activePassesList: activePasses.map(p => ({
      _id: p._id,
      passCode: p.passCode,
      passType: p.passType,
      ownerName: p.ownerName,
      visitorName: p.visitorName,
      flatCode: p.flatCode,
      currentlyInside: p.peopleCurrentlyInside,
      validUntil: p.validUntil,
      isExpired: new Date(p.validUntil) < now,
    })),
    expiredAlertsCount: expiredPassesInside.length,
    expiredPassesInside,
    recentEvents: recentEventsRes.rows,
  };
}
