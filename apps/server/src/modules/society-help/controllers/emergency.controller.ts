import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  triggerEmergencyAlert,
  acknowledgeEmergencyAlert,
  cancelEmergencyAlert,
  getActiveEmergencyAlerts,
  getEmergencyAlertHistory,
} from '../services/emergency.service';

export async function triggerEmergencyHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { notes } = req.body;

    const uRes = await query(
      `SELECT u.*, f.flat_number, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];

    const flatCode = dbUser?.flat_number ? `${dbUser.block_name}-${dbUser.flat_number}` : 'A-101';
    const block = dbUser?.block_name || 'A';

    const alert = await triggerEmergencyAlert({
      societyId: user.societyId,
      residentUserId: user.userId,
      flatCode,
      block,
      notes,
    });

    res.status(201).json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to trigger emergency alert.' });
  }
}

export async function acknowledgeEmergencyHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { alertId } = req.params;
    const { notes } = req.body;

    const uRes = await query('SELECT username, full_name FROM users WHERE id = $1', [user.userId]);
    const dbUser = uRes.rows[0];
    const guardName = dbUser?.full_name || dbUser?.username || 'Security Guard';

    const alert = await acknowledgeEmergencyAlert({
      alertId,
      guardUserId: user.userId,
      guardName,
      notes,
    });

    res.json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to acknowledge alert.' });
  }
}

export async function cancelEmergencyHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { alertId } = req.params;
    const { reason } = req.body;

    const alert = await cancelEmergencyAlert({
      alertId,
      residentUserId: user.userId,
      reason,
    });

    res.json(alert);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel alert.' });
  }
}

export async function getActiveAlertsHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const alerts = await getActiveEmergencyAlerts(user.societyId);
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch emergency alerts.' });
  }
}

export async function getAlertHistoryHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { limit } = req.query;
    const alerts = await getEmergencyAlertHistory(
      user.societyId,
      limit ? Number(limit) : 20
    );
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch alert history.' });
  }
}
