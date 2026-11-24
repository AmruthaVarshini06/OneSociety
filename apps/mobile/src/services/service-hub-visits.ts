import apiClient from '../api/client';

export const getVisits = (params?: { agreementId?: string; date?: string }) =>
  apiClient.get('/api/v1/services/visits', { params });

export const confirmVisitByProvider = (id: string, notes?: string) =>
  apiClient.patch(`/api/v1/services/visits/${id}/confirm-provider`, { notes });

export const confirmVisitBySeeker = (id: string, notes?: string) =>
  apiClient.patch(`/api/v1/services/visits/${id}/confirm-seeker`, { notes });

export const markVisitNoShow = (id: string) =>
  apiClient.patch(`/api/v1/services/visits/${id}/no-show`);
