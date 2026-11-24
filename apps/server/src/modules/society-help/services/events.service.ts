import { query } from '../../../config/supabase';
import { createVisitorPass } from './gate-pass.service';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log as auditLog } from '../../../shared/audit/audit.service';

export interface CreateEventDto {
  title: string;
  eventType: string;
  startDate: Date | string;
  endDate: Date | string;
  dailyTimeFrom: string;
  dailyTimeTo: string;
  estimatedVisitors: number;
  hasLoudSound: boolean;
  loudSoundType?: string;
  loudSoundEndTime?: string;
  expectedVehicles?: number;
  useCommonAreas?: boolean;
  notes?: string;
}

function isDuringQuietHours(timeStr: string, quietStart = '22:00', quietEnd = '06:00'): boolean {
  if (!timeStr) return false;
  return timeStr >= quietStart || timeStr < quietEnd;
}

export async function createCommunityEvent(
  societyId: string,
  hostUserId: string,
  hostFlatCode: string,
  dto: CreateEventDto
) {
  const quietStart = '22:00';
  const quietEnd = '06:00';

  let isQuietHoursFlagged = false;
  let quietHoursWarning: string | null = null;

  const endTimeToCheck = dto.loudSoundEndTime || dto.dailyTimeTo;
  if (dto.hasLoudSound && isDuringQuietHours(endTimeToCheck, quietStart, quietEnd)) {
    isQuietHoursFlagged = true;
    quietHoursWarning = `Quiet Hours Warning: Society quiet hours start at ${quietStart}. Loud sound (music/DJ/crackers) after ${quietStart} requires prior committee approval and is flagged for the president.`;
  }

  const startDateIso = new Date(dto.startDate).toISOString();
  const endDateIso = new Date(dto.endDate).toISOString();

  const insertRes = await query(
    `INSERT INTO community_events (
      society_id, host_id, host_flat_code, title, event_type,
      start_date, end_date, daily_time_from, daily_time_to,
      estimated_visitors, has_loud_sound, loud_sound_type,
      loud_sound_end_time, expected_vehicles, use_common_areas,
      notes, is_quiet_hours_flagged, quiet_hours_warning
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      societyId,
      hostUserId,
      hostFlatCode,
      dto.title.trim(),
      dto.eventType,
      startDateIso,
      endDateIso,
      dto.dailyTimeFrom,
      dto.dailyTimeTo,
      dto.estimatedVisitors || 10,
      dto.hasLoudSound || false,
      dto.loudSoundType || null,
      dto.loudSoundEndTime || null,
      dto.expectedVehicles || 0,
      dto.useCommonAreas || false,
      dto.notes?.trim() || null,
      isQuietHoursFlagged,
      quietHoursWarning,
    ]
  );

  const event = insertRes.rows[0];

  // Auto-generate guest pass
  const guestPass = await createVisitorPass(
    societyId,
    { userId: hostUserId, role: 'resident' },
    hostFlatCode,
    {
      visitorName: `Guests for ${dto.title}`,
      purpose: `Event: ${dto.title}`,
      validFrom: startDateIso,
      validUntil: endDateIso,
      expectedPeople: dto.estimatedVisitors || 20,
    }
  );

  auditLog(hostUserId, societyId, 'COMMUNITY_EVENT_ANNOUNCED', event.id, 'CommunityEvent', {
    title: event.title,
    hostFlatCode,
    isQuietHoursFlagged,
  });

  return {
    event: {
      _id: event.id,
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      hostFlatCode: event.host_flat_code,
      startDate: event.start_date,
      endDate: event.end_date,
      dailyTimeFrom: event.daily_time_from,
      dailyTimeTo: event.daily_time_to,
      hasLoudSound: event.has_loud_sound,
      loudSoundType: event.loud_sound_type,
      loudSoundEndTime: event.loud_sound_end_time,
      isQuietHoursFlagged: event.is_quiet_hours_flagged,
      notes: event.notes,
    },
    guestPass,
    quietHoursWarning,
  };
}

export async function getEventsDashboard(
  societyId: string,
  userRole: string
) {
  const res = await query(
    `SELECT * FROM community_events WHERE society_id = $1 ORDER BY start_date ASC`,
    [societyId]
  );
  const events = res.rows;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const todayEvents: any[] = [];
  const upcomingEvents: any[] = [];
  const pastEvents: any[] = [];

  const isStaff = userRole === 'guard' || userRole === 'president';

  for (const ev of events) {
    const formatted = {
      _id: ev.id,
      id: ev.id,
      title: ev.title,
      eventType: ev.event_type,
      hostFlatCode: ev.host_flat_code,
      startDate: ev.start_date,
      endDate: ev.end_date,
      dailyTimeFrom: ev.daily_time_from,
      dailyTimeTo: ev.daily_time_to,
      hasLoudSound: ev.has_loud_sound,
      loudSoundType: ev.loud_sound_type,
      loudSoundEndTime: ev.loud_sound_end_time,
      isQuietHoursFlagged: ev.is_quiet_hours_flagged,
      presidentNotes: ev.president_notes,
      useCommonAreas: ev.use_common_areas,
      estimatedVisitors: isStaff ? ev.estimated_visitors : undefined,
      expectedVehicles: isStaff ? ev.expected_vehicles : undefined,
      notes: isStaff ? ev.notes : undefined,
    };

    const start = new Date(ev.start_date);
    const end = new Date(ev.end_date);

    if (end < startOfToday) {
      pastEvents.push(formatted);
    } else if (start <= endOfToday && end >= startOfToday) {
      todayEvents.push(formatted);
    } else {
      upcomingEvents.push(formatted);
    }
  }

  return {
    todayEvents,
    upcomingEvents,
    pastEvents,
  };
}

export async function addPresidentEventNote(
  eventId: string,
  presidentUserId: string,
  societyId: string,
  note: string
) {
  const res = await query(
    `UPDATE community_events SET president_notes = $1 WHERE id = $2 AND society_id = $3 RETURNING *`,
    [note.trim(), eventId, societyId]
  );
  if (res.rows.length === 0) throw new Error('Event not found');

  const event = res.rows[0];
  auditLog(presidentUserId, societyId, 'EVENT_NOTE_ADDED', event.id, 'CommunityEvent', { note });

  return {
    _id: event.id,
    id: event.id,
    presidentNotes: event.president_notes,
  };
}
