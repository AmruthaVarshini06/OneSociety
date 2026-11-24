import apiClient from '../api/client';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'PAID_IN_ESCROW'
  | 'PICKUP_PENDING'
  | 'IN_USE'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'SETTLED'
  | 'IN_DISPUTE'
  | 'OVERDUE'
  | 'EXPIRED';

export type BillingUnit = 'HOUR' | 'DAY';

export interface ChargeCalculation {
  rate: number;
  units: number;
  chargePaise: number;
  depositPaise: number;
  totalPaise: number;
}

export interface PickupPhoto {
  url: string;
  timestamp: string;
  uploadedBy: 'RENTER' | 'OWNER';
  caption?: string;
}

export interface ReturnPhoto {
  url: string;
  timestamp: string;
  uploadedBy: 'OWNER' | 'RENTER';
  caption?: string;
}

export interface ReturnSummary {
  booking: RentalBooking;
  item: { _id: string; name: string; chargeDailyPaise?: number };
  calc: {
    actualTimeUsedMs: number;
    billedUnits: number;
    finalRentalChargePaise: number;
    earlyRefundPaise: number;
    overtimeChargePaise: number;
  };
  currentTime: string;
}

export interface BookingExtension {
  requestedUnits: number;
  additionalChargePaise: number;
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID';
  requestedAt?: string;
  respondedAt?: string;
  paidAt?: string;
}

export interface RentalBooking {
  _id: string;
  societyId: string;
  itemId: { _id: string; name: string; category: string; photos: string[] } | string;
  renterId: { _id: string; username: string } | string;
  ownerId: { _id: string; username: string } | string;
  renterFlatId: { _id: string; number: string } | string;
  ownerFlatId: { _id: string; number: string } | string;
  billingUnit: BillingUnit;
  bookedUnits: number;
  startAt: string;
  expectedEndAt: string;
  effectiveEndAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  ratePerUnitPaise: number;
  safeDepositPaise: number;
  chargeCalculation: ChargeCalculation;
  status: BookingStatus;
  declineReason?: string;
  cancelledBy?: 'renter' | 'owner' | 'system';
  expiresAt: string;
  escrowHoldKey?: string;

  // Phase 4 fields
  pickupPhotos?: PickupPhoto[];
  handoverConfirmedAt?: string;
  handoverConfirmedByOwner?: boolean;
  extension?: BookingExtension;

  // Phase 5 fields
  returnPhotos?: ReturnPhoto[];
  actualTimeUsedMs?: number;
  billedUnits?: number;
  gracePeriodMinutes?: number;
  finalRentalChargePaise?: number;
  earlyRefundPaise?: number;
  overtimeChargePaise?: number;
  overtimePaymentMethod?: 'DIRECT_PAYMENT' | 'DEDUCT_FROM_DEPOSIT' | 'NONE';
  overtimePaid?: boolean;
  conditionConfirmedByOwner?: 'GOOD' | 'ISSUE';
  ownerConditionNotes?: string;
  renterSatisfactionConfirmed?: boolean;
  renterSatisfactionConfirmedAt?: string;

  finalChargeReleasedPaise?: number;
  depositRefundedPaise?: number;
  extraChargePaise?: number;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPreview {
  item: {
    _id: string;
    name: string;
    category: string;
    chargeHourlyPaise?: number;
    chargeDailyPaise?: number;
    safeDepositPaise: number;
    pickupLocation: string;
  };
  calc: ChargeCalculation;
}

export interface CreateBookingPayload {
  itemId: string;
  billingUnit: BillingUnit;
  bookedUnits: number;
  startAt: string; // ISO
}

export interface ListBookingsParams {
  role?: 'renter' | 'owner' | 'all';
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListBookingsResponse {
  bookings: RentalBooking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Booking API ───────────────────────────────────────────────────────

export async function previewBookingCharge(
  itemId: string,
  billingUnit: BillingUnit,
  bookedUnits: number,
): Promise<BookingPreview> {
  const res = await apiClient.post<{ success: boolean; data: BookingPreview }>(
    '/api/v1/rentals/bookings/preview',
    { itemId, billingUnit, bookedUnits },
  );
  return res.data.data;
}

export async function createBooking(payload: CreateBookingPayload): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    '/api/v1/rentals/bookings',
    payload,
  );
  return res.data.data;
}

export async function respondToBooking(
  id: string,
  action: 'ACCEPT' | 'DECLINE',
  declineReason?: string,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/respond`,
    { action, declineReason },
  );
  return res.data.data;
}

export async function payForBooking(id: string): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/pay`,
    { paymentId: 'mock_payment' },
  );
  return res.data.data;
}

export async function cancelBooking(id: string): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/cancel`,
  );
  return res.data.data;
}

export async function listBookings(params?: ListBookingsParams): Promise<ListBookingsResponse> {
  const res = await apiClient.get<{ success: boolean; data: ListBookingsResponse }>(
    '/api/v1/rentals/bookings',
    { params },
  );
  return res.data.data;
}

export async function getBookingById(id: string): Promise<RentalBooking> {
  const res = await apiClient.get<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}`,
  );
  return res.data.data;
}

export async function uploadPickupPhotos(
  id: string,
  photos: Array<{ url: string; timestamp?: string; caption?: string }>,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/pickup-photos`,
    { photos },
  );
  return res.data.data;
}

export async function confirmHandover(
  id: string,
  ownerPhotos?: Array<{ url: string; timestamp?: string; caption?: string }>,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/confirm-handover`,
    { ownerPhotos },
  );
  return res.data.data;
}

export async function requestExtension(
  id: string,
  additionalUnits: number,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/request-extension`,
    { additionalUnits },
  );
  return res.data.data;
}

export async function respondExtension(
  id: string,
  action: 'APPROVE' | 'DECLINE',
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/respond-extension`,
    { action },
  );
  return res.data.data;
}

export async function payExtension(id: string): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/pay-extension`,
    { paymentId: 'mock_payment' },
  );
  return res.data.data;
}

export async function uploadReturnPhotos(
  id: string,
  photos: Array<{ url: string; timestamp?: string; caption?: string }>,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/return-photos`,
    { photos },
  );
  return res.data.data;
}

export async function getReturnSummary(id: string): Promise<ReturnSummary> {
  const res = await apiClient.get<{ success: boolean; data: ReturnSummary }>(
    `/api/v1/rentals/bookings/${id}/return-summary`,
  );
  return res.data.data;
}

export async function confirmReturn(
  id: string,
  condition: 'GOOD' | 'ISSUE',
  notes?: string,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/confirm-return`,
    { condition, notes },
  );
  return res.data.data;
}

export async function payOvertime(
  id: string,
  method: 'DIRECT_PAYMENT' | 'DEDUCT_FROM_DEPOSIT',
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/pay-overtime`,
    { method, paymentId: 'mock_payment' },
  );
  return res.data.data;
}

export async function renterConfirmReturn(
  id: string,
  satisfactionNotes?: string,
): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/renter-confirm`,
    { satisfactionNotes },
  );
  return res.data.data;
}

export async function settleBooking(id: string): Promise<RentalBooking> {
  const res = await apiClient.post<{ success: boolean; data: RentalBooking }>(
    `/api/v1/rentals/bookings/${id}/settle`,
  );
  return res.data.data;
}
