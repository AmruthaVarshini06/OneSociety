import apiClient from '../api/client';

export interface ScopeCheckResponse {
  scopeStatus: 'SOCIETY_VALID' | 'INTERNAL_FLAT_BLOCKED' | 'UNCLEAR_PRESIDENT_REVIEW';
  message?: string;
  suggestServiceHub: boolean;
  serviceHubCategorySlug?: string;
}

// Resident & Public Complaint Endpoints
export const checkComplaintScope = (data: { description: string; specificArea: string; category?: string }) =>
  apiClient.post<ScopeCheckResponse>('/api/v1/complaints/scope-check', data);

export const getSimilarComplaints = (data: {
  category: string;
  block?: string;
  specificArea: string;
  description: string;
}) => apiClient.post('/api/v1/complaints/similar', data);

export const submitComplaint = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/complaints', data);

export const getComplaintsFeed = (params?: Record<string, unknown>) =>
  apiClient.get('/api/v1/complaints/feed', { params });

export const getClusterDetails = (id: string) =>
  apiClient.get(`/api/v1/complaints/cluster/${id}`);

export const editComplaint = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/api/v1/complaints/${id}/edit`, data);

export const withdrawComplaint = (id: string, reason?: string) =>
  apiClient.post(`/api/v1/complaints/${id}/withdraw`, { reason });

export const reopenIssue = (clusterId: string, data: { reason: string; photos: string[] }) =>
  apiClient.post(`/api/v1/complaints/cluster/${clusterId}/reopen`, data);

export const confirmIssueFixed = (clusterId: string) =>
  apiClient.post(`/api/v1/complaints/cluster/${clusterId}/confirm-fixed`);

// President Actions
export const getPresidentDashboard = () =>
  apiClient.get('/api/v1/complaints/admin/dashboard');

export const getPresidentReports = () =>
  apiClient.get('/api/v1/complaints/admin/reports');

export const markContacted = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/contacted`, data);

export const startWorkInProgress = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/work-in-progress`, data);

export const addProgressUpdate = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/progress-update`, data);

export const markSolved = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/solved`, data);

export const recordCost = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/cost`, data);

export const recordPayment = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/payment`, data);

export const markOutOfScope = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/out-of-scope`, data);

export const overridePriority = (clusterId: string, data: Record<string, unknown>) =>
  apiClient.post(`/api/v1/complaints/admin/cluster/${clusterId}/override-priority`, data);

export const mergeClusters = (sourceClusterId: string, targetClusterId: string) =>
  apiClient.post('/api/v1/complaints/admin/merge', { sourceClusterId, targetClusterId });

export const splitCluster = (data: {
  sourceClusterId: string;
  complaintIdsToMove: string[];
  newTitle: string;
  newCategory: string;
}) => apiClient.post('/api/v1/complaints/admin/split', data);

export const hideSpamComplaint = (complaintId: string, reason: string) =>
  apiClient.post(`/api/v1/complaints/admin/complaint/${complaintId}/spam`, { reason });

// Vendors
export const getSuggestedVendors = (category?: string) =>
  apiClient.get('/api/v1/complaints/vendors/suggested', { params: { category } });

export const getLocalVendors = () =>
  apiClient.get('/api/v1/complaints/vendors/local');

export const createLocalVendor = (data: Record<string, unknown>) =>
  apiClient.post('/api/v1/complaints/vendors/local', data);

export const updateLocalVendor = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/api/v1/complaints/vendors/local/${id}`, data);

export const getBatchingSuggestions = () =>
  apiClient.get('/api/v1/complaints/vendors/batching');

export const checkVendorClash = (vendorPhone: string, visitDate: string, clusterId?: string) =>
  apiClient.get('/api/v1/complaints/vendors/clash-check', {
    params: { vendorPhone, visitDate, clusterId },
  });
