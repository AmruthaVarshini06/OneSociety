import apiClient from '../api/client';

export interface AppNotification {
  _id: string;
  userId: string;
  societyId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}

export async function getNotifications(params?: {
  isRead?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  const res = await apiClient.get('/api/v1/notifications', { params });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<{ message: string; notification: AppNotification }> {
  const res = await apiClient.patch(`/api/v1/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<{ message: string; modifiedCount: number }> {
  const res = await apiClient.patch('/api/v1/notifications/read-all');
  return res.data;
}
