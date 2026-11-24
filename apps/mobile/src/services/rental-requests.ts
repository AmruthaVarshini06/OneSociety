import apiClient from '../api/client';
import type { ItemCondition, AiPriceVerification } from './rentals';

export type RequestStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type DurationType = 'HOURS' | 'DAYS';

export interface ItemRequest {
  _id: string;
  societyId: string;
  requesterId: { _id: string; username: string } | string;
  flatId: { _id: string; number: string } | string;
  itemName: string;
  category: string;
  purpose?: string;
  neededFrom: string;
  durationValue: number;
  durationType: DurationType;
  budgetPaise?: number;
  status: RequestStatus;
  acceptedOfferId?: string | null;
  dismissedBy: string[];
  offersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemOffer {
  _id: string;
  requestId: string;
  societyId: string;
  offeredById: { _id: string; username: string } | string;
  flatId: { _id: string; number: string } | string;
  existingItemId?: string | null;
  itemName: string;
  photos: string[];
  condition: ItemCondition;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
  message?: string;
  aiPriceVerification?: AiPriceVerification;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequestPayload {
  itemName: string;
  category: string;
  purpose?: string;
  neededFrom: string; // ISO date
  durationValue: number;
  durationType: DurationType;
  budgetPaise?: number;
}

export interface CreateItemOfferPayload {
  existingItemId?: string;
  itemName: string;
  photos?: string[];
  condition?: ItemCondition;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
  message?: string;
}

export interface ListRequestsParams {
  category?: string;
  status?: RequestStatus;
  page?: number;
  limit?: number;
}

export interface ListRequestsResponse {
  requests: ItemRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RequestDetailResponse {
  request: ItemRequest;
  offers: ItemOffer[];
  isRequester: boolean;
}

// ── Requests ─────────────────────────────────────────────────────────

export async function createItemRequest(
  payload: CreateItemRequestPayload,
): Promise<ItemRequest> {
  const res = await apiClient.post<{ success: boolean; data: ItemRequest }>(
    '/api/v1/rentals/requests',
    payload,
  );
  return res.data.data;
}

export async function listItemRequests(
  params?: ListRequestsParams,
): Promise<ListRequestsResponse> {
  const res = await apiClient.get<{ success: boolean; data: ListRequestsResponse }>(
    '/api/v1/rentals/requests',
    { params },
  );
  return res.data.data;
}

export async function getMyItemRequests(): Promise<ItemRequest[]> {
  const res = await apiClient.get<{ success: boolean; data: ItemRequest[] }>(
    '/api/v1/rentals/requests/mine',
  );
  return res.data.data;
}

export async function getItemRequestById(id: string): Promise<RequestDetailResponse> {
  const res = await apiClient.get<{ success: boolean; data: RequestDetailResponse }>(
    `/api/v1/rentals/requests/${id}`,
  );
  return res.data.data;
}

export async function dismissItemRequest(id: string): Promise<void> {
  await apiClient.post(`/api/v1/rentals/requests/${id}/dismiss`);
}

export async function cancelItemRequest(id: string): Promise<void> {
  await apiClient.post(`/api/v1/rentals/requests/${id}/cancel`);
}

// ── Offers ───────────────────────────────────────────────────────────

export async function makeItemOffer(
  requestId: string,
  payload: CreateItemOfferPayload,
): Promise<ItemOffer> {
  const res = await apiClient.post<{ success: boolean; data: ItemOffer }>(
    `/api/v1/rentals/requests/${requestId}/offers`,
    payload,
  );
  return res.data.data;
}

export async function acceptItemOffer(
  requestId: string,
  offerId: string,
): Promise<{ request: ItemRequest; offer: ItemOffer }> {
  const res = await apiClient.post<{
    success: boolean;
    data: { request: ItemRequest; offer: ItemOffer };
  }>(`/api/v1/rentals/requests/${requestId}/offers/${offerId}/accept`);
  return res.data.data;
}

export async function withdrawItemOffer(
  requestId: string,
  offerId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/rentals/requests/${requestId}/offers/${offerId}`,
  );
}
