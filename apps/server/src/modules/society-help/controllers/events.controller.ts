import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  createCommunityEvent,
  getEventsDashboard,
  addPresidentEventNote,
} from '../services/events.service';

export async function createEventHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const dto = req.body;

    if (!dto.title || !dto.eventType || !dto.startDate || !dto.endDate) {
      res.status(400).json({ error: 'title, eventType, startDate, and endDate are required.' });
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
    const hostFlatCode = dbUser?.flat_number ? `${dbUser.block_name}-${dbUser.flat_number}` : 'Common';

    const result = await createCommunityEvent(
      user.societyId,
      user.userId,
      hostFlatCode,
      {
        title: dto.title,
        eventType: dto.eventType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        dailyTimeFrom: dto.dailyTimeFrom || '10:00',
        dailyTimeTo: dto.dailyTimeTo || '20:00',
        estimatedVisitors: Number(dto.estimatedVisitors || 10),
        hasLoudSound: Boolean(dto.hasLoudSound),
        loudSoundType: dto.loudSoundType,
        loudSoundEndTime: dto.loudSoundEndTime,
        expectedVehicles: Number(dto.expectedVehicles || 0),
        useCommonAreas: Boolean(dto.useCommonAreas),
        notes: dto.notes,
      }
    );

    res.status(201).json({
      ...result.event,
      guestPassCode: result.guestPass.passCode,
      quietHoursWarning: result.quietHoursWarning,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create event.' });
  }
}

export async function getEventsDashboardHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const data = await getEventsDashboard(
      user.societyId,
      user.role
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch events.' });
  }
}

export async function addPresidentNoteHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can add official event notes.' });
      return;
    }

    const { eventId } = req.params;
    const { note } = req.body;

    if (!note) {
      res.status(400).json({ error: 'note is required.' });
      return;
    }

    const event = await addPresidentEventNote(
      eventId,
      user.userId,
      user.societyId,
      note
    );

    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add note.' });
  }
}
