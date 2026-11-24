import apiClient from '../api/client';

export const listProviders = (filters?: Record<string, unknown>) =>
  apiClient.get('/api/v1/services/providers', { params: filters });

export const getProvider = (id: string) =>
  apiClient.get(`/api/v1/services/providers/${id}`);

export const registerInternal = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/services/providers/register-internal', data);

export const updateProfile = (id: string, data: Record<string, unknown>) =>
  apiClient.patch(`/api/v1/services/providers/${id}`, data);

export const uploadDocument = (id: string, formData: FormData) =>
  apiClient.post(`/api/v1/services/providers/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getDocuments = (id: string) =>
  apiClient.get(`/api/v1/services/providers/${id}/documents`);

export const reviewProvider = (id: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/services/providers/${id}/review`, data);

export const suspendProvider = (id: string, reason: string) =>
  apiClient.post(`/api/v1/services/providers/${id}/suspend`, { reason });

export const reactivateProvider = (id: string) =>
  apiClient.post(`/api/v1/services/providers/${id}/reactivate`);

export const convertToPermanent = (id: string) =>
  apiClient.post(`/api/v1/services/providers/${id}/convert-permanent`);

export const createExternalProvider = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/services/providers/create-external', data);
