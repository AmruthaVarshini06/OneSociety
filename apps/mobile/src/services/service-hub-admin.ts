import apiClient from '../api/client';

export const getVerificationQueue = () =>
  apiClient.get('/api/v1/services/admin/verification-queue');

export const getAllAdminProviders = (filters?: Record<string, unknown>) =>
  apiClient.get('/api/v1/services/admin/providers', { params: filters });

export const getAdminReports = () =>
  apiClient.get('/api/v1/services/admin/reports');

export const createExternalAccount = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/services/admin/external-accounts', data);

export const deactivateExternalAccount = (id: string) =>
  apiClient.patch(`/api/v1/services/admin/external-accounts/${id}/deactivate`);

export const convertExternalToPermanent = (id: string) =>
  apiClient.post(`/api/v1/services/admin/external-accounts/${id}/convert-permanent`);

export const getAdminComplaints = (status?: string) =>
  apiClient.get('/api/v1/services/admin/complaints', { params: { status } });

export const resolveComplaint = (id: string, data: { status: 'RESOLVED' | 'DISMISSED'; notes: string }) =>
  apiClient.patch(`/api/v1/services/complaints/${id}/resolve`, data);

export const listCategories = () =>
  apiClient.get('/api/v1/services/categories');

export const getCategory = (slug: string) =>
  apiClient.get(`/api/v1/services/categories/${slug}`);

export const createCategory = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/services/categories', data);
