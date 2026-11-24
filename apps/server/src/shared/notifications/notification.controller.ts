import type { Request, Response } from 'express';
import * as svc from './notification.service';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

  const result = await svc.getUserNotifications(req.user!.userId, { isRead, page, limit });
  res.json(result);
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const notification = await svc.markNotificationRead(req.params.id, req.user!.userId);
  if (!notification) {
    res.status(404).json({ message: 'Notification not found' });
    return;
  }
  res.json({ message: 'Marked as read', notification });
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const count = await svc.markAllNotificationsRead(req.user!.userId);
  res.json({ message: 'All notifications marked as read', modifiedCount: count });
}
