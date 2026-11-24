import apiClient from '../api/client';

export const createRequest = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/services/requests', data);

export const getSeekerRequests = () =>
  apiClient.get('/api/v1/services/requests/seeker');

export const getProviderRequests = () =>
  apiClient.get('/api/v1/services/requests/provider');

export const getRequest = (id: string) =>
  apiClient.get(`/api/v1/services/requests/${id}`);

export const respondToRequest = (id: string, data: Record<string, unknown>) =>
  apiClient.patch(`/api/v1/services/requests/${id}/respond`, data);

export const cancelRequest = (id: string) =>
  apiClient.delete(`/api/v1/services/requests/${id}/cancel`);
