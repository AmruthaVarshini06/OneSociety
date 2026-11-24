import { query } from '../../../config/supabase';
import { log as auditLog } from '../../../shared/audit/audit.service';

export interface GuardFlatPresenceResult {
  flatCode: string;
  status: 'PRESENT' | 'NOT_PRESENT';
  lastUpdated: Date | null;
  isStale: boolean; // older than 24 hours
  activeEventTitle?: string; // if an event is currently running at the flat
}

/**
 * Resident sets "someone is at home" status with optional away-until.
 */
export async function updateFlatPresence(
  societyId: string,
  flatId: string,
  userId: string,
  isAtHome: boolean,
  awayUntil?: Date
) {
  const flatRes = await query(
    `SELECT f.*, b.name as block_name 
     FROM flats f 
     JOIN blocks b ON f.block_id = b.id 
     WHERE f.id = $1 AND f.society_id = $2`,
    [flatId, societyId]
  );
  if (flatRes.rows.length === 0) throw new Error('Flat not found');

  const flat = flatRes.rows[0];
  const awayUntilIso = awayUntil ? awayUntil.toISOString() : null;

  await query(
    `UPDATE flats 
     SET is_at_home = $1, away_until = $2 
     WHERE id = $3`,
    [isAtHome, awayUntilIso, flatId]
  );

  auditLog(userId, societyId, 'PRESENCE_STATUS_UPDATED', flat.id, 'Flat', {
    flatNumber: `${flat.block_name}-${flat.flat_number}`,
    isAtHome,
    awayUntil,
  });

  return {
    flatId: flat.id,
    flatCode: `${flat.block_name}-${flat.flat_number}`,
    isAtHome,
    atHomeUpdatedAt: new Date(),
  };
}

/**
 * Guard flat search: returns ONLY PRESENT / NOT PRESENT and last-updated time.
 * Strictly NO resident names, phone numbers, or family details!
 */
export async function searchFlatPresence(
  societyId: string,
  flatQuery: string
): Promise<GuardFlatPresenceResult[]> {
  const cleanQuery = flatQuery.trim().replace(/\s+/g, '-');
  
  const flatsRes = await query(
    `SELECT f.*, b.name as block_name 
     FROM flats f 
     JOIN blocks b ON f.block_id = b.id 
     WHERE f.society_id = $1 
       AND (f.flat_number ILIKE $2 OR CONCAT(b.name, '-', f.flat_number) ILIKE $2)`,
    [societyId, `%${cleanQuery}%`]
  );

  const now = Date.now();
  const staleHours = 24;
  const results: GuardFlatPresenceResult[] = [];

  for (const f of flatsRes.rows) {
    const flatCode = `${f.block_name}-${f.flat_number}`;
    let isPresent = f.is_at_home;

    // Check if an event is currently running at this flat
    const eventRes = await query(
      `SELECT * FROM community_events 
       WHERE society_id = $1 
         AND host_flat_code = $2 
         AND start_date <= NOW() 
         AND end_date >= NOW() 
       LIMIT 1`,
      [societyId, flatCode]
    );

    const activeEvent = eventRes.rows[0];
    if (activeEvent) {
      isPresent = true; // Event running counts as someone at home
    }

    const lastUpdated = f.away_until || null;
    const isStale = false; // standard active status

    results.push({
      flatCode,
      status: isPresent ? 'PRESENT' : 'NOT_PRESENT',
      lastUpdated,
      isStale,
      activeEventTitle: activeEvent?.title,
    });
  }

  return results;
}

/**
 * Checks whether a single flat has someone at home right now.
 */
export async function isFlatOccupiedNow(
  societyId: string,
  flatCode: string
): Promise<{ isAtHome: boolean; activeEventTitle?: string }> {
  const parts = flatCode.split('-');
  let fRes;
  if (parts.length === 2) {
    fRes = await query(
      `SELECT f.* FROM flats f 
       JOIN blocks b ON f.block_id = b.id 
       WHERE f.society_id = $1 AND b.name ILIKE $2 AND f.flat_number ILIKE $3`,
      [societyId, parts[0], parts[1]]
    );
  } else {
    fRes = await query(
      `SELECT f.* FROM flats f 
       WHERE f.society_id = $1 AND f.flat_number ILIKE $2`,
      [societyId, flatCode]
    );
  }

  if (fRes.rows.length === 0) return { isAtHome: true }; // Default open if flat not found

  // Check running events
  const eventRes = await query(
    `SELECT * FROM community_events 
     WHERE society_id = $1 
       AND host_flat_code = $2 
       AND start_date <= NOW() 
       AND end_date >= NOW() 
     LIMIT 1`,
    [societyId, flatCode]
  );

  const activeEvent = eventRes.rows[0];
  if (activeEvent) {
    return { isAtHome: true, activeEventTitle: activeEvent.title };
  }

  return { isAtHome: fRes.rows[0].is_at_home };
}
