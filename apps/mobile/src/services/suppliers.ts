import apiClient from '../api/client';

export interface Supplier {
  _id: string;
  userId: { _id: string; username: string; preferredLanguage: string; isActive: boolean } | string;
  societyId: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  gstNumber?: string;
  gstVerified: boolean;
  verificationStatus: 'PENDING_REVIEW' | 'GST_VERIFIED' | 'APPROVED' | 'REJECTED';
  verifiedBy?: string;
  verificationNote?: string;
  idDocumentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListSuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

// ── President API ─────────────────────────────────────────────────────────

export interface CreateSupplierPayload {
  username: string;
  tempPassword: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  gstNumber?: string;
  idDocumentUrl?: string;
}

export async function createSupplier(
  payload: CreateSupplierPayload,
): Promise<{ supplier: Supplier; gstWarning?: string }> {
  const res = await apiClient.post('/api/v1/group-buying/suppliers/register', payload);
  return res.data;
}

export async function listSuppliers(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ListSuppliersResponse> {
  const res = await apiClient.get('/api/v1/group-buying/suppliers', { params });
  return res.data;
}

export async function getSupplier(id: string): Promise<{ supplier: Supplier }> {
  const res = await apiClient.get(`/api/v1/group-buying/suppliers/${id}`);
  return res.data;
}

export async function verifySupplier(
  id: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<{ supplier: Supplier; message: string }> {
  const res = await apiClient.patch(`/api/v1/group-buying/suppliers/${id}/verify`, {
    action,
    note,
  });
  return res.data;
}

// ── Supplier self API ─────────────────────────────────────────────────────

export async function getMyProfile(): Promise<{ supplier: Supplier }> {
  const res = await apiClient.get('/api/v1/group-buying/suppliers/me');
  return res.data;
}

export async function updateMyProfile(payload: {
  businessName?: string;
  contactName?: string;
  contactPhone?: string;
  gstNumber?: string;
  idDocumentUrl?: string;
}): Promise<{ supplier: Supplier; gstWarning?: string; message: string }> {
  const res = await apiClient.put('/api/v1/group-buying/suppliers/me/profile', payload);
  return res.data;
}
