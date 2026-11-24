import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  getOrCreateFamilyPass,
  getOrCreatePresidentPass,
  getOrCreateProviderPass,
  createVisitorPass,
  revokePass,
  scanPassByGuard,
  confirmPassScan,
  getLiveGateDashboard,
  GuardPassCreationForbiddenError,
} from '../services/gate-pass.service';
import {
  logManualVisitor,
  markManualVisitorExit,
  getCurrentlyInsideManualVisitors,
  recordShiftHandover,
} from '../services/manual-visitor.service';
import {
  updateFlatPresence,
  searchFlatPresence,
} from '../services/presence.service';

export async function getMyFamilyPassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const uRes = await query(
      `SELECT u.*, f.flat_number, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];
    if (!dbUser?.flat_id) {
      res.status(400).json({ error: 'User is not linked to any flat.' });
      return;
    }
    const flatCode = `${dbUser.block_name}-${dbUser.flat_number}`;
    const pass = await getOrCreateFamilyPass(
      user.societyId,
      user.userId,
      dbUser.flat_id,
      flatCode,
      dbUser.full_name || dbUser.username
    );
    res.json(pass);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve family pass.' });
  }
}

export async function getMyPresidentPassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the society president can access this pass.' });
      return;
    }
    const uRes = await query('SELECT username, full_name FROM users WHERE id = $1', [user.userId]);
    const dbUser = uRes.rows[0];
    const pass = await getOrCreatePresidentPass(
      user.societyId,
      user.userId,
      dbUser?.full_name || dbUser?.username || 'Society President'
    );
    res.json(pass);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve president pass.' });
  }
}

export async function getMyProviderPassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const pass = await getOrCreateProviderPass(
      user.societyId,
      user.userId
    );
    res.json(pass);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve provider pass.' });
  }
}

export async function createVisitorPassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { visitorName, visitorPhone, purpose, validFrom, validUntil, expectedPeople } = req.body;

    if (!visitorName) {
      res.status(400).json({ error: 'Visitor name is required.' });
      return;
    }

    const uRes = await query(
      `SELECT u.*, f.flat_number, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];
    const flatCode = dbUser?.flat_number ? `${dbUser.block_name}-${dbUser.flat_number}` : 'Common';

    const pass = await createVisitorPass(
      user.societyId,
      {
        userId: user.userId,
        role: user.role,
      },
      flatCode,
      {
        visitorName,
        visitorPhone,
        purpose: purpose || 'Visit',
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        expectedPeople: expectedPeople || 1,
      }
    );

    res.status(201).json(pass);
  } catch (err: any) {
    if (err instanceof GuardPassCreationForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to create visitor pass.' });
  }
}

export async function getVisitorPassByCodeHandler(req: Request, res: Response) {
  try {
    const { passCode } = req.params;
    const resPass = await query('SELECT * FROM qr_passes WHERE pass_code = $1', [passCode]);
    if (resPass.rows.length === 0) {
      res.status(404).json({ error: 'Pass not found.' });
      return;
    }
    const r = resPass.rows[0];
    res.json({
      _id: r.id,
      id: r.id,
      passCode: r.pass_code,
      passType: r.pass_type,
      ownerName: r.owner_name,
      flatCode: r.flat_code,
      visitorName: r.visitor_name,
      visitorPhone: r.visitor_phone,
      purpose: r.purpose,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      status: r.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch pass.' });
  }
}

export async function listMyPassesHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const uRes = await query(
      `SELECT u.*, f.flat_number, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];
    const flatCode = dbUser?.flat_number ? `${dbUser.block_name}-${dbUser.flat_number}` : null;

    let passesRes;
    if (flatCode) {
      passesRes = await query(
        `SELECT * FROM qr_passes WHERE society_id = $1 AND (flat_code = $2 OR owner_name ILIKE $3) ORDER BY created_at DESC`,
        [user.societyId, flatCode, `%${dbUser.full_name || dbUser.username}%`]
      );
    } else {
      passesRes = await query(
        `SELECT * FROM qr_passes WHERE society_id = $1 AND owner_name ILIKE $2 ORDER BY created_at DESC`,
        [user.societyId, `%${dbUser.full_name || dbUser.username}%`]
      );
    }

    res.json(passesRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      passCode: r.pass_code,
      passType: r.pass_type,
      ownerName: r.owner_name,
      flatCode: r.flat_code,
      visitorName: r.visitor_name,
      visitorPhone: r.visitor_phone,
      purpose: r.purpose,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      status: r.status,
      peopleCurrentlyInside: r.people_currently_inside,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list passes.' });
  }
}

export async function revokePassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { passId } = req.params;
    const { reason } = req.body;

    const pass = await revokePass(passId, user.userId, user.societyId, reason);
    res.json({ message: 'Pass revoked successfully', pass });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to revoke pass.' });
  }
}

export async function scanPassHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { passCode } = req.body;
    if (!passCode) {
      res.status(400).json({ error: 'passCode is required.' });
      return;
    }

    const result = await scanPassByGuard(passCode.trim(), user.userId, user.societyId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Pass scan failed.' });
  }
}

export async function confirmScanHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { passId, direction, count, notes } = req.body;

    if (!passId || !direction || count === undefined) {
      res.status(400).json({ error: 'passId, direction (ENTRY|EXIT), and count are required.' });
      return;
    }

    const result = await confirmPassScan(
      passId,
      user.userId,
      user.societyId,
      direction,
      Number(count),
      notes
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Scan confirmation failed.' });
  }
}

export async function getLiveDashboardHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const data = await getLiveGateDashboard(user.societyId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load gate dashboard.' });
  }
}

export async function logManualVisitorHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const dto = req.body;

    if (!dto.visitorName || !dto.flatCode || !dto.purpose || !dto.visitorType) {
      res.status(400).json({ error: 'visitorType, visitorName, flatCode, and purpose are required.' });
      return;
    }

    const result = await logManualVisitor(user.societyId, user.userId, dto);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to log visitor.' });
  }
}

export async function markManualVisitorExitHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { logId } = req.params;

    const result = await markManualVisitorExit(logId, user.societyId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to mark exit.' });
  }
}

export async function getCurrentlyInsideHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const manualVisitors = await getCurrentlyInsideManualVisitors(user.societyId);
    const passesRes = await query(
      `SELECT * FROM qr_passes WHERE society_id = $1 AND people_currently_inside > 0`,
      [user.societyId]
    );

    const passesInside = passesRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      passCode: r.pass_code,
      passType: r.pass_type,
      ownerName: r.owner_name,
      visitorName: r.visitor_name,
      flatCode: r.flat_code,
      peopleCurrentlyInside: r.people_currently_inside,
      validUntil: r.valid_until,
    }));

    res.json({
      manualVisitors,
      passesInside,
      totalInsideManual: manualVisitors.reduce((sum: number, v: any) => sum + (v.peopleCount || 1), 0),
      totalInsidePasses: passesInside.reduce((sum: number, p: any) => sum + p.peopleCurrentlyInside, 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load inside visitors.' });
  }
}

export async function recordHandoverHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { notes, toGuardId } = req.body;

    const handover = await recordShiftHandover(
      user.societyId,
      user.userId,
      {
        notes: notes || 'Shift handover completed.',
        toGuardId,
      }
    );
    res.status(201).json(handover);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record shift handover.' });
  }
}

export async function getPresenceStatusHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const uRes = await query(
      `SELECT u.*, f.flat_number, f.is_at_home, f.away_until, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];
    if (!dbUser?.flat_id) {
      res.status(400).json({ error: 'User is not linked to any flat.' });
      return;
    }
    const flatCode = `${dbUser.block_name}-${dbUser.flat_number}`;
    res.json({
      flatId: dbUser.flat_id,
      flatCode,
      isAtHome: dbUser.is_at_home ?? true,
      atHomeUpdatedAt: dbUser.away_until || new Date(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch presence status.' });
  }
}

export async function updatePresenceStatusHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { isAtHome, awayUntil } = req.body;
    const uRes = await query('SELECT flat_id FROM users WHERE id = $1', [user.userId]);
    const dbUser = uRes.rows[0];
    if (!dbUser?.flat_id) {
      res.status(400).json({ error: 'User is not linked to any flat.' });
      return;
    }

    const result = await updateFlatPresence(
      user.societyId,
      dbUser.flat_id,
      user.userId,
      Boolean(isAtHome),
      awayUntil ? new Date(awayUntil) : undefined
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update presence status.' });
  }
}

export async function searchFlatPresenceHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { flatCode } = req.query;
    if (!flatCode || typeof flatCode !== 'string') {
      res.status(400).json({ error: 'flatCode query param is required.' });
      return;
    }

    const result = await searchFlatPresence(user.societyId, flatCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to search flat presence.' });
  }
}
