import apiClient from '../api/client';

export interface PriceTier {
  minQuantity: number;
  pricePerUnit: number; // paise
}

export interface GroupOrder {
  _id: string;
  societyId: string;
  createdBy: string;
  productName: string;
  productCategory: string;
  description: string;
  productImageUrl?: string;
  unit: string;
  minimumQuantity: number;
  status: string;
  demandOpenAt: string;
  demandCloseAt: string;
  totalDemandedQuantity: number;
  tiers?: PriceTier[];
  supplierId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemandItem {
  _id: string;
  groupOrderId: string;
  flatId: string;
  userId: string;
  quantityWanted: number;
  createdAt: string;
  updatedAt: string;
}

// ── Shared (all roles) ────────────────────────────────────────────────────

export async function listGroupOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ orders: GroupOrder[]; total: number; page: number; limit: number }> {
  const res = await apiClient.get('/api/v1/group-buying/orders', { params });
  return res.data;
}

export async function getGroupOrder(id: string): Promise<{ order: GroupOrder }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${id}`);
  return res.data;
}

// ── President only ────────────────────────────────────────────────────────

export interface CreateGroupOrderPayload {
  productName: string;
  productCategory: string;
  description: string;
  productImageUrl?: string;
  unit: string;
  minimumQuantity: number;
  demandCloseAt: string; // ISO 8601
}

export async function createGroupOrder(
  payload: CreateGroupOrderPayload,
): Promise<{ order: GroupOrder }> {
  const res = await apiClient.post('/api/v1/group-buying/orders', payload);
  return res.data;
}

export async function cancelGroupOrder(
  id: string,
  reason: string,
): Promise<{ order: GroupOrder; message: string }> {
  const res = await apiClient.patch(`/api/v1/group-buying/orders/${id}/cancel`, { reason });
  return res.data;
}

export async function getDemandSummary(
  id: string,
): Promise<{ items: unknown[]; total: number }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${id}/demand-summary`);
  return res.data;
}

// ── Resident: demand ──────────────────────────────────────────────────────

export async function getMyDemand(
  orderId: string,
): Promise<{ item: DemandItem | null }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/demand/me`);
  return res.data;
}

export async function upsertDemand(
  orderId: string,
  quantityWanted: number,
): Promise<{ item: DemandItem; totalDemandedQuantity: number }> {
  const res = await apiClient.put(`/api/v1/group-buying/orders/${orderId}/demand`, {
    quantityWanted,
  });
  return res.data;
}

export async function retractDemand(
  orderId: string,
): Promise<{ totalDemandedQuantity: number }> {
  const res = await apiClient.delete(`/api/v1/group-buying/orders/${orderId}/demand`);
  return res.data;
}
