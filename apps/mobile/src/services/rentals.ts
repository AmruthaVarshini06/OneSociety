import apiClient from '../api/client';

export interface PriceRange {
  min: number; // paise
  max: number; // paise
}

export type ItemCondition = 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'HEAVILY_USED';
export type ItemStatus = 'DRAFT' | 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' | 'UNAVAILABLE';
export type AiVerdict = 'FAIR' | 'TOO_HIGH' | 'TOO_LOW' | 'PENDING_REVIEW';

export interface AiPriceVerification {
  verdict: AiVerdict;
  suggestedHourlyRangePaise?: PriceRange;
  suggestedDailyRangePaise?: PriceRange;
  suggestedDepositRangePaise?: PriceRange;
  reason: string;
  verifiedAt: string;
}

export interface RentalCatalogCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  suggestedHourlyRangePaise?: PriceRange;
  suggestedDailyRangePaise?: PriceRange;
  suggestedDepositRangePaise: PriceRange;
  order: number;
  availableCount: number;
}

export interface RentalItem {
  _id: string;
  societyId: string;
  ownerId: { _id: string; username: string } | string;
  flatId: { _id: string; number: string } | string;
  name: string;
  category: string;
  description: string;
  photos: string[];
  ageYears: number;
  condition: ItemCondition;
  estimatedPurchasePricePaise?: number;
  pickupLocation: string;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
  usageRules: string[];
  aiPriceVerification: AiPriceVerification;
  status: ItemStatus;
  isAvailable: boolean;
  totalBookings: number;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyPricePayload {
  name: string;
  category: string;
  ageYears?: number;
  condition?: ItemCondition;
  estimatedPurchasePricePaise?: number;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
}

export interface CreateRentalItemPayload {
  name: string;
  category: string;
  description: string;
  photos: string[];
  ageYears?: number;
  condition?: ItemCondition;
  estimatedPurchasePricePaise?: number;
  pickupLocation: string;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
  usageRules?: string[];
}

export interface ListRentalItemsParams {
  category?: string;
  search?: string;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
}

export interface ListRentalItemsResponse {
  items: RentalItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Catalog ─────────────────────────────────────────────────────────────

export async function getCatalog(): Promise<RentalCatalogCategory[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalCatalogCategory[] }>(
    '/api/v1/rentals/items/catalog',
  );
  return res.data.data;
}

// ── AI Price Verification ────────────────────────────────────────────────

export async function verifyPrice(payload: VerifyPricePayload): Promise<AiPriceVerification> {
  const res = await apiClient.post<{ success: boolean; data: AiPriceVerification }>(
    '/api/v1/rentals/items/verify-price',
    payload,
  );
  return res.data.data;
}

// ── Rental Items ────────────────────────────────────────────────────────

export async function createRentalItem(payload: CreateRentalItemPayload): Promise<RentalItem> {
  const res = await apiClient.post<{ success: boolean; data: RentalItem }>(
    '/api/v1/rentals/items',
    payload,
  );
  return res.data.data;
}

export async function listRentalItems(
  params?: ListRentalItemsParams,
): Promise<ListRentalItemsResponse> {
  const res = await apiClient.get<{ success: boolean; data: ListRentalItemsResponse }>(
    '/api/v1/rentals/items',
    { params },
  );
  return res.data.data;
}

export async function getMyRentalItems(): Promise<RentalItem[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalItem[] }>(
    '/api/v1/rentals/items/my-items',
  );
  return res.data.data;
}

export async function getRentalItem(id: string): Promise<RentalItem> {
  const res = await apiClient.get<{ success: boolean; data: RentalItem }>(
    `/api/v1/rentals/items/${id}`,
  );
  return res.data.data;
}

export async function updateRentalItem(
  id: string,
  payload: Partial<CreateRentalItemPayload> & { isAvailable?: boolean },
): Promise<RentalItem> {
  const res = await apiClient.patch<{ success: boolean; data: RentalItem }>(
    `/api/v1/rentals/items/${id}`,
    payload,
  );
  return res.data.data;
}

export async function toggleItemAvailability(
  id: string,
  isAvailable?: boolean,
): Promise<RentalItem> {
  const res = await apiClient.patch<{ success: boolean; data: RentalItem }>(
    `/api/v1/rentals/items/${id}/availability`,
    { isAvailable },
  );
  return res.data.data;
}

export async function deleteRentalItem(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/rentals/items/${id}`);
}

export async function escalateRentalItem(id: string, reason: string): Promise<RentalItem> {
  const res = await apiClient.post<{ success: boolean; data: RentalItem }>(
    `/api/v1/rentals/items/${id}/escalate`,
    { reason },
  );
  return res.data.data;
}

// ── President Reviews ────────────────────────────────────────────────────

export async function listPendingReviews(): Promise<RentalItem[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalItem[] }>(
    '/api/v1/rentals/items/pending-reviews',
  );
  return res.data.data;
}

export async function reviewRentalItem(
  id: string,
  decision: 'APPROVE' | 'REJECT',
  reason: string,
): Promise<RentalItem> {
  const res = await apiClient.post<{ success: boolean; data: RentalItem }>(
    `/api/v1/rentals/items/${id}/review`,
    { decision, reason },
  );
  return res.data.data;
}
