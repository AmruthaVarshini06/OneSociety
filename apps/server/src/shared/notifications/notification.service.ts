import { query } from '../../config/supabase';
import { sendWhatsApp } from './adapters/whatsapp.mock';
import { io } from '../../config/socket';

export interface NotificationRecord {
  id: string;
  userId: string;
  societyId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

function mapRow(row: any): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    societyId: row.society_id,
    title: row.title,
    body: row.body,
    type: row.type,
    referenceId: row.reference_id,
    data: row.data || {},
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function sendNotification(
  userId: string | any,
  title: string,
  body: string,
  type: string,
  referenceId?: string | any,
  data?: Record<string, unknown>,
): Promise<NotificationRecord | null> {
  try {
    const uid = userId ? userId.toString() : '';
    const refId = referenceId ? referenceId.toString() : null;

    const userRes = await query(
      'SELECT id, society_id, username FROM users WHERE id = $1',
      [uid]
    );
    if (userRes.rows.length === 0) {
      console.warn(`[NOTIFICATION] User not found: ${uid}`);
      return null;
    }

    const user = userRes.rows[0];

    const insertRes = await query(
      `INSERT INTO notifications (user_id, society_id, title, body, type, reference_id, data, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [uid, user.society_id, title, body, type, refId, JSON.stringify(data || {})]
    );

    const notif = mapRow(insertRes.rows[0]);

    if (io) {
      io.to(`user:${uid}`).emit('notification:new', notif);
    }

    sendWhatsApp(user.username, `[OneSociety] ${title}: ${body}`);

    return notif;
  } catch (err) {
    console.error('[NOTIFICATION] Failed to send notification:', err);
    return null;
  }
}

export async function sendSocietyNotification(
  societyId: string | any,
  title: string,
  body: string,
  type: string,
  referenceId?: string | any,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const socId = societyId ? societyId.toString() : '';
    const refId = referenceId ? referenceId.toString() : null;

    const usersRes = await query(
      'SELECT id, username FROM users WHERE society_id = $1 AND is_active = true',
      [socId]
    );

    for (const u of usersRes.rows) {
      await query(
        `INSERT INTO notifications (user_id, society_id, title, body, type, reference_id, data, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
        [u.id, socId, title, body, type, refId, JSON.stringify(data || {})]
      );
    }

    if (io) {
      io.to(`society:${socId}`).emit('notification:society', {
        title,
        body,
        type,
        referenceId: refId,
        data,
      });
    }

    sendWhatsApp(`Society Group (${socId})`, `[OneSociety Broadcast] ${title}: ${body}`);
  } catch (err) {
    console.error('[NOTIFICATION] Failed to broadcast society notification:', err);
  }
}

export async function getUserNotifications(
  userId: string,
  options?: { isRead?: boolean; page?: number; limit?: number },
): Promise<{
  notifications: NotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 30;
  const offset = (page - 1) * limit;

  let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
  const queryParams: any[] = [userId];

  if (options?.isRead !== undefined) {
    queryParams.push(options.isRead);
    queryText += ` AND is_read = $${queryParams.length}`;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(limit, offset);

  const [itemsRes, totalRes, unreadRes] = await Promise.all([
    query(queryText, queryParams),
    query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
  ]);

  return {
    notifications: itemsRes.rows.map(mapRow),
    unreadCount: parseInt(unreadRes.rows[0].count, 10),
    total: parseInt(totalRes.rows[0].count, 10),
    page,
    limit,
  };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<NotificationRecord | null> {
  const res = await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const res = await query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return res.rowCount || 0;
}
