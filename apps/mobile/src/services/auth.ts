import apiClient from '../api/client';
import { AuthUser } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (
    username: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/api/v1/auth/login',
      { username, password }
    );
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await apiClient.post<RefreshResponse>(
      '/api/v1/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await apiClient.post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  updateFcmToken: async (fcmToken: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/fcm-token', { fcmToken });
  },
};
