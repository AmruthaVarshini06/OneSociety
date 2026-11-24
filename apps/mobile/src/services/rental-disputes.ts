import apiClient from '../api/client';

export type DisputeCategory =
  | 'DAMAGE'
  | 'MISSING_PART'
  | 'NOT_CLEAN'
  | 'LATE_RETURN'
  | 'OTHER';

export type DisputeStatus =
  | 'OPEN'
  | 'RESOLVED_MUTUAL'
  | 'ESCALATED'
  | 'RESOLVED_PRESIDENT';

export interface RentalDispute {
  _id: string;
  bookingId: string | { _id: string; itemId?: { name?: string }; status?: string };
  societyId: string;
  ownerId: string | { _id: string; username: string };
  renterId: string | { _id: string; username: string };
  claimedAmountPaise: number;
  issueCategory: DisputeCategory;
  ownerDescription: string;
  ownerEvidencePhotos: string[];
  renterResponse: 'PENDING' | 'ACCEPTED' | 'CONTESTED';
  renterCounterNote?: string;
  status: DisputeStatus;
  settlementSplit?: {
    ownerAmountPaise: number;
    renterRefundPaise: number;
  };
  presidentDecision?: {
    decidedBy?: string | { _id: string; username: string };
    decisionReason: string;
    decidedAt: string;
  };
  escalatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputePayload {
  claimedAmountPaise: number;
  issueCategory: DisputeCategory;
  description: string;
  evidencePhotos?: string[];
}

export interface ResolvePresidentPayload {
  ownerAmountPaise: number;
  renterRefundPaise: number;
  decisionReason: string;
}

export async function createDispute(
  bookingId: string,
  payload: CreateDisputePayload,
): Promise<RentalDispute> {
  const res = await apiClient.post<{ success: boolean; data: RentalDispute }>(
    `/api/v1/rentals/disputes/bookings/${bookingId}`,
    payload,
  );
  return res.data.data;
}

export async function respondToDispute(
  bookingId: string,
  action: 'ACCEPT' | 'CONTEST',
  counterNote?: string,
): Promise<RentalDispute> {
  const res = await apiClient.post<{ success: boolean; data: RentalDispute }>(
    `/api/v1/rentals/disputes/bookings/${bookingId}/respond`,
    { action, counterNote },
  );
  return res.data.data;
}

export async function escalateDispute(bookingId: string): Promise<RentalDispute> {
  const res = await apiClient.post<{ success: boolean; data: RentalDispute }>(
    `/api/v1/rentals/disputes/bookings/${bookingId}/escalate`,
  );
  return res.data.data;
}

export async function resolveDisputeByPresident(
  bookingId: string,
  payload: ResolvePresidentPayload,
): Promise<RentalDispute> {
  const res = await apiClient.post<{ success: boolean; data: RentalDispute }>(
    `/api/v1/rentals/disputes/bookings/${bookingId}/resolve-president`,
    payload,
  );
  return res.data.data;
}

export async function getDisputeByBookingId(bookingId: string): Promise<RentalDispute | null> {
  try {
    const res = await apiClient.get<{ success: boolean; data: RentalDispute }>(
      `/api/v1/rentals/disputes/bookings/${bookingId}`,
    );
    return res.data.data;
  } catch (err) {
    return null;
  }
}

export async function listPendingDisputes(): Promise<RentalDispute[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalDispute[] }>(
    '/api/v1/rentals/disputes/pending',
  );
  return res.data.data;
}
