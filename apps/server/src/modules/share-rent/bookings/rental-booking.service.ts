import { query } from '../../../config/supabase';
import * as escrowService from '../../../shared/escrow/escrow.service';
import * as auditService from '../../../shared/audit/audit.service';
import { sendNotification } from '../../../shared/notifications/notification.service';
import type {
  CreateBookingInput,
  RespondBookingInput,
  PayBookingInput,
  ListBookingsQuery,
  UploadPickupPhotosInput,
  ConfirmHandoverInput,
  RequestExtensionInput,
  RespondExtensionInput,
  PayExtensionInput,
  UploadReturnPhotosInput,
  ConfirmReturnInput,
  PayOvertimeInput,
  RenterConfirmInput,
} from './rental-booking.schema';

const OWNER_RESPONSE_HOURS = 12;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface FinalChargeResult {
  actualTimeUsedMs: number;
  billedUnits: number;
  finalRentalChargePaise: number;
  earlyRefundPaise: number;
  overtimeChargePaise: number;
}

export interface ChargeCalculation {
  rate: number;
  units: number;
  chargePaise: number;
  depositPaise: number;
  totalPaise: number;
}

export interface PickupPhoto {
  url: string;
  timestamp: Date;
  uploadedBy: 'RENTER' | 'OWNER';
  caption?: string;
}

export interface ReturnPhoto {
  url: string;
  timestamp: Date;
  uploadedBy: 'OWNER' | 'RENTER';
  caption?: string;
}

export interface BookingExtension {
  requestedUnits: number;
  additionalChargePaise: number;
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED' | 'PAID';
  requestedAt?: Date;
  respondedAt?: Date;
  paidAt?: Date;
  escrowHoldKey?: string;
}

export interface RentalBookingDocument {
  id: string;
  _id: string;
  societyId: string;
  itemId: any;
  renterId: any;
  ownerId: any;
  renterFlatId: any;
  ownerFlatId: any;
  billingUnit: 'HOUR' | 'DAY';
  bookedUnits: number;
  startAt: Date;
  expectedEndAt: Date;
  effectiveEndAt: Date;
  actualStartAt?: Date;
  actualEndAt?: Date;
  ratePerUnitPaise: number;
  safeDepositPaise: number;
  chargeCalculation: ChargeCalculation;
  status: string;
  expiresAt: Date;
  declineReason?: string;
  cancelledBy?: string;
  escrowHoldKey?: string;
  pickupPhotos: PickupPhoto[];
  returnPhotos: ReturnPhoto[];
  handoverConfirmedAt?: Date;
  handoverConfirmedByOwner?: boolean;
  extension?: BookingExtension;
  gracePeriodMinutes?: number;
  actualTimeUsedMs?: number;
  billedUnits?: number;
  finalRentalChargePaise?: number;
  earlyRefundPaise?: number;
  overtimeChargePaise?: number;
  overtimePaid?: boolean;
  overtimePaymentMethod?: string;
  conditionConfirmedByOwner?: string;
  ownerConditionNotes?: string;
  renterSatisfactionConfirmed?: boolean;
  renterSatisfactionConfirmedAt?: Date;
  finalChargeReleasedPaise?: number;
  depositRefundedPaise?: number;
  extraChargePaise?: number;
  settledAt?: Date;
  createdAt: Date;
}

export function calculateFinalTimeCharge(
  actualStartAt: Date,
  actualEndAt: Date,
  billingUnit: 'HOUR' | 'DAY',
  ratePerUnitPaise: number,
  bookedUnits: number,
  dailyRateCapPaise?: number,
  gracePeriodMinutes = 15,
  lateFeeMultiplier = 1.0,
): FinalChargeResult {
  const actualTimeUsedMs = Math.max(0, actualEndAt.getTime() - actualStartAt.getTime());
  const unitMs = billingUnit === 'HOUR' ? MS_PER_HOUR : MS_PER_DAY;
  const graceMs = gracePeriodMinutes * 60 * 1000;

  const netMs = Math.max(0, actualTimeUsedMs - graceMs);
  const billedUnits = Math.max(1, Math.ceil(netMs / unitMs));

  let finalRentalChargePaise = billedUnits * ratePerUnitPaise;

  if (billingUnit === 'HOUR' && dailyRateCapPaise && billedUnits <= 24) {
    finalRentalChargePaise = Math.min(finalRentalChargePaise, dailyRateCapPaise);
  }

  const initialBookedChargePaise = bookedUnits * ratePerUnitPaise;
  let earlyRefundPaise = 0;
  let overtimeChargePaise = 0;

  if (billedUnits < bookedUnits) {
    earlyRefundPaise = Math.max(0, initialBookedChargePaise - finalRentalChargePaise);
  } else if (billedUnits > bookedUnits) {
    const extraUnits = billedUnits - bookedUnits;
    overtimeChargePaise = Math.round(extraUnits * ratePerUnitPaise * lateFeeMultiplier);
  }

  return {
    actualTimeUsedMs,
    billedUnits,
    finalRentalChargePaise,
    earlyRefundPaise,
    overtimeChargePaise,
  };
}

export function calculateBookingCharge(
  ratePerUnitPaise: number,
  safeDepositPaise: number,
  bookedUnits: number,
): ChargeCalculation {
  const chargePaise = ratePerUnitPaise * bookedUnits;
  const depositPaise = safeDepositPaise;
  return {
    rate: ratePerUnitPaise,
    units: bookedUnits,
    chargePaise,
    depositPaise,
    totalPaise: chargePaise + depositPaise,
  };
}

function computeEndAt(startAt: Date, units: number, billingUnit: 'HOUR' | 'DAY'): Date {
  const ms = billingUnit === 'HOUR' ? units * MS_PER_HOUR : units * MS_PER_DAY;
  return new Date(startAt.getTime() + ms);
}

async function resolveFlatId(userId: string, societyId: string): Promise<string> {
  const uRes = await query('SELECT flat_id FROM users WHERE id = $1', [userId]);
  if (uRes.rows[0]?.flat_id) return uRes.rows[0].flat_id.toString();
  const fRes = await query('SELECT id FROM flats WHERE society_id = $1 LIMIT 1', [societyId]);
  if (!fRes.rows[0]) throw new Error('User is not associated with a flat in this society.');
  return fRes.rows[0].id.toString();
}

function mapBooking(row: any): RentalBookingDocument {
  const pickupPhotos = Array.isArray(row.pickup_photos) ? row.pickup_photos : typeof row.pickup_photos === 'string' ? JSON.parse(row.pickup_photos) : [];
  const returnPhotos = Array.isArray(row.return_photos) ? row.return_photos : typeof row.return_photos === 'string' ? JSON.parse(row.return_photos) : [];
  const extensions = Array.isArray(row.extensions) ? row.extensions : typeof row.extensions === 'string' ? JSON.parse(row.extensions) : [];
  const latestExt = extensions.length > 0 ? extensions[extensions.length - 1] : undefined;

  const rate = Number(row.rate_per_unit_paise || 0);
  const units = Number(row.booked_units || 1);
  const chargePaise = Number(row.charge_paise || rate * units);
  const depositPaise = Number(row.safe_deposit_paise || 0);

  return {
    id: row.id,
    _id: row.id,
    societyId: row.society_id,
    itemId: row.item_name ? {
      id: row.item_id,
      _id: row.item_id,
      name: row.item_name,
      category: row.item_category,
      photos: Array.isArray(row.item_photos) ? row.item_photos : [],
      safeDepositPaise: Number(row.item_safe_deposit_paise || 0),
      chargeHourlyPaise: Number(row.item_hourly_rate_paise || 0),
      chargeDailyPaise: Number(row.item_daily_rate_paise || 0),
    } : row.item_id,
    renterId: row.renter_username ? { id: row.renter_id, _id: row.renter_id, username: row.renter_username } : row.renter_id,
    ownerId: row.owner_username ? { id: row.owner_id, _id: row.owner_id, username: row.owner_username } : row.owner_id,
    renterFlatId: row.renter_flat_number ? { id: row.renter_flat_id, _id: row.renter_flat_id, number: row.renter_flat_number } : row.renter_flat_id,
    ownerFlatId: row.owner_flat_number ? { id: row.owner_flat_id, _id: row.owner_flat_id, number: row.owner_flat_number } : row.owner_flat_id,
    billingUnit: (row.billing_unit === 'DAYS' ? 'DAY' : row.billing_unit || 'HOUR') as 'HOUR' | 'DAY',
    bookedUnits: units,
    startAt: new Date(row.start_at || row.created_at),
    expectedEndAt: new Date(row.expected_end_at || row.created_at),
    effectiveEndAt: new Date(row.effective_end_at || row.expected_end_at || row.created_at),
    actualStartAt: row.actual_start_at ? new Date(row.actual_start_at) : undefined,
    actualEndAt: row.actual_end_at ? new Date(row.actual_end_at) : undefined,
    ratePerUnitPaise: rate,
    safeDepositPaise: depositPaise,
    chargeCalculation: {
      rate,
      units,
      chargePaise,
      depositPaise,
      totalPaise: chargePaise + depositPaise,
    },
    status: row.status,
    expiresAt: new Date(Date.now() + 12 * 3600_000),
    pickupPhotos,
    returnPhotos,
    extension: latestExt,
    finalRentalChargePaise: row.charge_paise ? Number(row.charge_paise) : undefined,
    earlyRefundPaise: row.early_refund_paise ? Number(row.early_refund_paise) : undefined,
    conditionConfirmedByOwner: row.condition_confirmed_by_owner,
    ownerConditionNotes: row.owner_condition_notes,
    finalChargeReleasedPaise: row.final_charge_released_paise ? Number(row.final_charge_released_paise) : undefined,
    depositRefundedPaise: row.deposit_refunded_paise ? Number(row.deposit_refunded_paise) : undefined,
    extraChargePaise: row.extra_charge_paise ? Number(row.extra_charge_paise) : undefined,
    settledAt: row.settled_at ? new Date(row.settled_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function previewBooking(
  itemId: string,
  billingUnit: 'HOUR' | 'DAY',
  bookedUnits: number,
  societyId: string,
) {
  const iRes = await query(
    `SELECT * FROM rental_items WHERE id = $1 AND society_id = $2 AND status = 'PUBLISHED' AND is_available = true`,
    [itemId, societyId]
  );
  const item = iRes.rows[0];
  if (!item) throw new Error('Item not found or not available for booking');

  const ratePerUnit = billingUnit === 'HOUR' ? Number(item.hourly_rate_paise || 0) : Number(item.daily_rate_paise || 0);
  if (!ratePerUnit || ratePerUnit <= 0) {
    throw new Error(`This item does not offer ${billingUnit.toLowerCase()}ly rates`);
  }

  const calc = calculateBookingCharge(ratePerUnit, Number(item.safe_deposit_paise || 0), bookedUnits);
  return { item, calc };
}

export async function createBooking(
  data: CreateBookingInput,
  renterId: string,
  societyId: string,
): Promise<RentalBookingDocument> {
  const iRes = await query(
    `SELECT * FROM rental_items WHERE id = $1 AND society_id = $2 AND status = 'PUBLISHED' AND is_available = true`,
    [data.itemId, societyId]
  );
  const item = iRes.rows[0];
  if (!item) throw new Error('Item not found or not currently available');
  if (item.owner_id.toString() === renterId) {
    throw new Error('You cannot book your own item');
  }

  const ratePerUnit = data.billingUnit === 'HOUR' ? Number(item.hourly_rate_paise || 0) : Number(item.daily_rate_paise || 0);
  if (!ratePerUnit || ratePerUnit <= 0) {
    throw new Error(`This item does not offer ${data.billingUnit.toLowerCase()}ly rates`);
  }

  const startAt = new Date(data.startAt);
  const expectedEndAt = computeEndAt(startAt, data.bookedUnits, data.billingUnit);

  const calc = calculateBookingCharge(ratePerUnit, Number(item.safe_deposit_paise || 0), data.bookedUnits);
  const renterFlatId = await resolveFlatId(renterId, societyId);
  const ownerFlatId = item.flat_id;

  const res = await query(
    `INSERT INTO rental_bookings (
      society_id, item_id, renter_id, owner_id, renter_flat_id, owner_flat_id,
      billing_unit, booked_units, rate_per_unit_paise, charge_paise,
      safe_deposit_paise, total_escrow_paise, start_at, expected_end_at, effective_end_at, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, 'REQUESTED')
    RETURNING *`,
    [
      societyId,
      item.id,
      renterId,
      item.owner_id,
      renterFlatId,
      ownerFlatId,
      data.billingUnit,
      data.bookedUnits,
      ratePerUnit,
      calc.chargePaise,
      calc.depositPaise,
      calc.totalPaise,
      startAt.toISOString(),
      expectedEndAt.toISOString(),
    ]
  );
  const booking = mapBooking(res.rows[0]);

  auditService.log(renterId, societyId, 'BOOKING_REQUESTED', booking.id, 'RentalBooking', {
    itemId: item.id,
    calc,
  });

  const unitLabel = data.billingUnit === 'HOUR' ? `${data.bookedUnits}h` : `${data.bookedUnits} day(s)`;
  await sendNotification(
    item.owner_id.toString(),
    'New Booking Request',
    `A neighbour wants to rent "${item.name}" for ${unitLabel}. Total: ₹${(calc.totalPaise / 100).toFixed(0)}. Please respond within 12 hours.`,
    'BOOKING_REQUESTED',
    booking.id,
    { bookingId: booking.id, itemId: item.id },
  );

  return booking;
}

export async function respondToBooking(
  bookingId: string,
  ownerId: string,
  data: RespondBookingInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND owner_id = $2 AND status = 'REQUESTED'`,
    [bookingId, ownerId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking request not found or already responded');

  const newStatus = data.action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const res = await query(
    `UPDATE rental_bookings SET status = $1 WHERE id = $2 RETURNING *`,
    [newStatus, bookingId]
  );
  const updated = mapBooking(res.rows[0]);

  if (data.action === 'ACCEPT') {
    await sendNotification(
      booking.renter_id.toString(),
      'Booking Accepted!',
      `Your rental request was accepted. Please complete the payment to confirm your booking.`,
      'BOOKING_ACCEPTED',
      bookingId,
      { bookingId },
    );
  } else {
    await sendNotification(
      booking.renter_id.toString(),
      'Booking Declined',
      `The owner declined your rental request. Try another listing.`,
      'BOOKING_DECLINED',
      bookingId,
      { bookingId },
    );
  }

  auditService.log(ownerId, booking.society_id, `BOOKING_${data.action}D`, bookingId, 'RentalBooking');
  return updated;
}

export async function payBooking(
  bookingId: string,
  renterId: string,
  _data: PayBookingInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND renter_id = $2 AND status = 'ACCEPTED'`,
    [bookingId, renterId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or not in ACCEPTED state');

  const escrowKey = `rental-booking-hold-${booking.id}`;
  const totalPaise = Number(booking.total_escrow_paise || 0);

  await escrowService.hold({
    ownerId: renterId,
    societyId: booking.society_id.toString(),
    amountPaise: totalPaise,
    purpose: `Rental booking hold for booking ${booking.id}`,
    referenceId: booking.id,
    idempotencyKey: escrowKey,
  });

  const res = await query(
    `UPDATE rental_bookings SET status = 'PICKUP_PENDING' WHERE id = $1 RETURNING *`,
    [bookingId]
  );
  const updated = mapBooking(res.rows[0]);

  auditService.log(renterId, booking.society_id, 'BOOKING_PAID', bookingId, 'RentalBooking', {
    totalPaise,
    escrowKey,
  });

  await sendNotification(
    booking.owner_id.toString(),
    'Booking Confirmed & Payment Received',
    `Payment received. The slot is confirmed. Prepare for handover.`,
    'BOOKING_PAID',
    bookingId,
    { bookingId },
  );

  return updated;
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  societyId: string,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status IN ('REQUESTED', 'ACCEPTED')`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or cannot be cancelled at this stage');

  const isRenter = booking.renter_id.toString() === userId;
  const isOwner = booking.owner_id.toString() === userId;
  if (!isRenter && !isOwner) throw new Error('Not authorized to cancel this booking');

  const cancelledBy = isRenter ? 'renter' : 'owner';
  const res = await query(
    `UPDATE rental_bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
    [bookingId]
  );
  const updated = mapBooking(res.rows[0]);

  const notifyId = isRenter ? booking.owner_id : booking.renter_id;
  await sendNotification(
    notifyId.toString(),
    'Booking Cancelled',
    `The booking was cancelled by the ${cancelledBy}.`,
    'BOOKING_CANCELLED',
    bookingId,
    { bookingId },
  );

  auditService.log(userId, societyId, 'BOOKING_CANCELLED', bookingId, 'RentalBooking', { cancelledBy });
  return updated;
}

export async function listBookings(userId: string, filterQuery: ListBookingsQuery) {
  let whereClauses: string[] = [];
  const params: any[] = [];
  let pIdx = 1;

  if (filterQuery.role === 'renter') {
    whereClauses.push(`rb.renter_id = $${pIdx}`);
    params.push(userId);
    pIdx++;
  } else if (filterQuery.role === 'owner') {
    whereClauses.push(`rb.owner_id = $${pIdx}`);
    params.push(userId);
    pIdx++;
  } else {
    whereClauses.push(`(rb.renter_id = $${pIdx} OR rb.owner_id = $${pIdx})`);
    params.push(userId);
    pIdx++;
  }

  if (filterQuery.status) {
    whereClauses.push(`rb.status = $${pIdx}`);
    params.push(filterQuery.status);
    pIdx++;
  }

  const whereStr = whereClauses.join(' AND ');
  const page = filterQuery.page || 1;
  const limit = filterQuery.limit || 20;
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int as total FROM rental_bookings rb WHERE ${whereStr}`, params);
  const total = countRes.rows[0]?.total || 0;

  const res = await query(
    `SELECT rb.*,
            ri.name as item_name, ri.category as item_category, ri.photos as item_photos,
            ri.safe_deposit_paise as item_safe_deposit_paise, ri.hourly_rate_paise as item_hourly_rate_paise, ri.daily_rate_paise as item_daily_rate_paise,
            ru.username as renter_username, ou.username as owner_username,
            rf.number as renter_flat_number, oflat.number as owner_flat_number
     FROM rental_bookings rb
     LEFT JOIN rental_items ri ON ri.id = rb.item_id
     LEFT JOIN users ru ON ru.id = rb.renter_id
     LEFT JOIN users ou ON ou.id = rb.owner_id
     LEFT JOIN flats rf ON rf.id = rb.renter_flat_id
     LEFT JOIN flats oflat ON oflat.id = rb.owner_flat_id
     WHERE ${whereStr}
     ORDER BY rb.created_at DESC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, limit, offset]
  );

  return { bookings: res.rows.map(mapBooking), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBookingById(
  bookingId: string,
  userId: string,
  role: string,
  societyId: string,
) {
  const res = await query(
    `SELECT rb.*,
            ri.name as item_name, ri.category as item_category, ri.photos as item_photos,
            ri.safe_deposit_paise as item_safe_deposit_paise, ri.hourly_rate_paise as item_hourly_rate_paise, ri.daily_rate_paise as item_daily_rate_paise,
            ru.username as renter_username, ou.username as owner_username,
            rf.number as renter_flat_number, oflat.number as owner_flat_number
     FROM rental_bookings rb
     LEFT JOIN rental_items ri ON ri.id = rb.item_id
     LEFT JOIN users ru ON ru.id = rb.renter_id
     LEFT JOIN users ou ON ou.id = rb.owner_id
     LEFT JOIN flats rf ON rf.id = rb.renter_flat_id
     LEFT JOIN flats oflat ON oflat.id = rb.owner_flat_id
     WHERE rb.id = $1 AND rb.society_id = $2`,
    [bookingId, societyId]
  );
  if (!res.rows[0]) throw new Error('Booking not found');
  const booking = mapBooking(res.rows[0]);

  const isRenter = booking.renterId?.id?.toString() === userId || booking.renterId?.toString() === userId;
  const isOwner = booking.ownerId?.id?.toString() === userId || booking.ownerId?.toString() === userId;
  const isPresident = role === 'president';

  if (!isRenter && !isOwner && !isPresident) {
    throw new Error('Not authorized to view this booking');
  }

  return booking;
}

export async function uploadPickupPhotos(
  bookingId: string,
  userId: string,
  societyId: string,
  data: UploadPickupPhotosInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status IN ('PICKUP_PENDING', 'IN_USE')`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or not in pickup/in-use stage');

  const isRenter = booking.renter_id.toString() === userId;
  const isOwner = booking.owner_id.toString() === userId;
  if (!isRenter && !isOwner) throw new Error('Only the renter or owner can upload pickup photos');

  const role = isRenter ? 'RENTER' : 'OWNER';
  const newPhotos = data.photos.map((p) => ({
    url: p.url,
    timestamp: p.timestamp ?? new Date(),
    uploadedBy: role,
    caption: p.caption,
  }));

  const existingPhotos = Array.isArray(booking.pickup_photos) ? booking.pickup_photos : typeof booking.pickup_photos === 'string' ? JSON.parse(booking.pickup_photos) : [];
  const merged = [...existingPhotos, ...newPhotos];

  const updateRes = await query(
    `UPDATE rental_bookings SET pickup_photos = $1 WHERE id = $2 RETURNING *`,
    [JSON.stringify(merged), bookingId]
  );

  auditService.log(userId, societyId, 'PICKUP_PHOTOS_UPLOADED', bookingId, 'RentalBooking', {
    count: newPhotos.length,
    uploadedBy: role,
  });

  return mapBooking(updateRes.rows[0]);
}

export async function confirmHandover(
  bookingId: string,
  userId: string,
  societyId: string,
  data?: ConfirmHandoverInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status = 'PICKUP_PENDING'`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or not in PICKUP_PENDING state');
  if (booking.owner_id.toString() !== userId) throw new Error('Only the owner can confirm handover');

  const now = new Date();
  const effectiveEndAt = computeEndAt(now, Number(booking.booked_units), booking.billing_unit);

  const updateRes = await query(
    `UPDATE rental_bookings
     SET status = 'IN_USE', actual_start_at = $1, effective_end_at = $2
     WHERE id = $3
     RETURNING *`,
    [now.toISOString(), effectiveEndAt.toISOString(), bookingId]
  );

  const updated = mapBooking(updateRes.rows[0]);
  auditService.log(userId, societyId, 'HANDOVER_CONFIRMED', bookingId, 'RentalBooking', {
    actualStartAt: now,
    effectiveEndAt,
  });

  await sendNotification(
    booking.renter_id.toString(),
    'Handover Confirmed - Rental Active!',
    `The owner confirmed pickup. Rental clock is active!`,
    'RENTAL_IN_USE',
    bookingId,
    { bookingId },
  );

  return updated;
}

export async function requestExtension(
  bookingId: string,
  renterId: string,
  societyId: string,
  data: RequestExtensionInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status = 'IN_USE' AND renter_id = $3`,
    [bookingId, societyId, renterId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Active booking not found or you are not the renter');

  const rate = Number(booking.rate_per_unit_paise || 0);
  const additionalChargePaise = rate * data.additionalUnits;

  const ext: BookingExtension = {
    requestedUnits: data.additionalUnits,
    additionalChargePaise,
    status: 'PENDING',
    requestedAt: new Date(),
  };

  const updateRes = await query(
    `UPDATE rental_bookings SET extensions = extensions || $1::jsonb WHERE id = $2 RETURNING *`,
    [JSON.stringify([ext]), bookingId]
  );

  await sendNotification(
    booking.owner_id.toString(),
    'Extension Requested',
    `Renter requested +${data.additionalUnits} extension for ₹${(additionalChargePaise / 100).toFixed(0)}. Please review.`,
    'EXTENSION_REQUESTED',
    bookingId,
    { bookingId },
  );

  return mapBooking(updateRes.rows[0]);
}

export async function respondExtension(
  bookingId: string,
  ownerId: string,
  societyId: string,
  data: RespondExtensionInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status = 'IN_USE' AND owner_id = $3`,
    [bookingId, societyId, ownerId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found');

  const extensions = Array.isArray(booking.extensions) ? booking.extensions : [];
  if (extensions.length === 0) throw new Error('No pending extension found');

  const lastExt = extensions[extensions.length - 1];
  lastExt.status = data.action === 'APPROVE' ? 'APPROVED' : 'DECLINED';
  lastExt.respondedAt = new Date();

  const updateRes = await query(
    `UPDATE rental_bookings SET extensions = $1 WHERE id = $2 RETURNING *`,
    [JSON.stringify(extensions), bookingId]
  );

  const updated = mapBooking(updateRes.rows[0]);

  await sendNotification(
    booking.renter_id.toString(),
    `Extension ${data.action === 'APPROVE' ? 'Approved' : 'Declined'}`,
    `Your extension was ${data.action.toLowerCase()}d.`,
    `EXTENSION_${data.action}D`,
    bookingId,
    { bookingId },
  );

  return updated;
}

export async function payExtension(
  bookingId: string,
  renterId: string,
  societyId: string,
  _data?: PayExtensionInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status = 'IN_USE' AND renter_id = $3`,
    [bookingId, societyId, renterId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found');

  const extensions = Array.isArray(booking.extensions) ? booking.extensions : [];
  const lastExt = extensions[extensions.length - 1];
  if (!lastExt || lastExt.status !== 'APPROVED') throw new Error('Extension is not approved or not ready for payment');

  const extKey = `rental-booking-ext-${booking.id}-${Date.now()}`;
  if (lastExt.additionalChargePaise > 0) {
    await escrowService.hold({
      ownerId: renterId,
      societyId,
      amountPaise: lastExt.additionalChargePaise,
      purpose: `Rental extension hold for booking ${booking.id}`,
      referenceId: booking.id,
      idempotencyKey: extKey,
    });
  }

  const currentEnd = new Date(booking.effective_end_at || booking.expected_end_at);
  const newEnd = computeEndAt(currentEnd, lastExt.requestedUnits, booking.billing_unit);

  lastExt.status = 'PAID';
  lastExt.paidAt = new Date();

  const updateRes = await query(
    `UPDATE rental_bookings
     SET effective_end_at = $1, booked_units = booked_units + $2, charge_paise = charge_paise + $3,
         total_escrow_paise = total_escrow_paise + $3, extensions = $4
     WHERE id = $5
     RETURNING *`,
    [newEnd.toISOString(), lastExt.requestedUnits, lastExt.additionalChargePaise, JSON.stringify(extensions), bookingId]
  );

  return mapBooking(updateRes.rows[0]);
}

export async function uploadReturnPhotos(
  bookingId: string,
  userId: string,
  societyId: string,
  data: UploadReturnPhotosInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status IN ('IN_USE', 'OVERDUE', 'RETURN_PENDING')`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or not in return stage');

  const isOwner = booking.owner_id.toString() === userId;
  const isRenter = booking.renter_id.toString() === userId;
  if (!isOwner && !isRenter) throw new Error('Only the owner or renter can upload return photos');

  const role = isOwner ? 'OWNER' : 'RENTER';
  const newPhotos = data.photos.map((p) => ({
    url: p.url,
    timestamp: p.timestamp ?? new Date(),
    uploadedBy: role,
    caption: p.caption,
  }));

  const existingPhotos = Array.isArray(booking.return_photos) ? booking.return_photos : typeof booking.return_photos === 'string' ? JSON.parse(booking.return_photos) : [];
  const merged = [...existingPhotos, ...newPhotos];

  const updateRes = await query(
    `UPDATE rental_bookings SET return_photos = $1, status = 'RETURN_PENDING' WHERE id = $2 RETURNING *`,
    [JSON.stringify(merged), bookingId]
  );

  return mapBooking(updateRes.rows[0]);
}

export async function calculateReturnSummary(
  bookingId: string,
  societyId: string,
) {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found');

  const iRes = await query('SELECT * FROM rental_items WHERE id = $1', [booking.item_id]);
  const item = iRes.rows[0];

  const startTime = booking.actual_start_at ? new Date(booking.actual_start_at) : new Date(booking.start_at);
  const endTime = new Date();

  const calc = calculateFinalTimeCharge(
    startTime,
    endTime,
    booking.billing_unit,
    Number(booking.rate_per_unit_paise),
    Number(booking.booked_units),
    item?.daily_rate_paise ? Number(item.daily_rate_paise) : undefined,
    15,
  );

  return { booking: mapBooking(booking), item, calc, currentTime: endTime };
}

export async function confirmReturn(
  bookingId: string,
  ownerId: string,
  societyId: string,
  data: ConfirmReturnInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status IN ('RETURN_PENDING', 'IN_USE', 'OVERDUE') AND owner_id = $3`,
    [bookingId, societyId, ownerId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Active booking not found or you are not the owner');

  const now = new Date();
  const startTime = booking.actual_start_at ? new Date(booking.actual_start_at) : new Date(booking.start_at);

  const calc = calculateFinalTimeCharge(
    startTime,
    now,
    booking.billing_unit,
    Number(booking.rate_per_unit_paise),
    Number(booking.booked_units),
    undefined,
    15,
  );

  if (data.condition === 'ISSUE') {
    const updateRes = await query(
      `UPDATE rental_bookings
       SET status = 'IN_DISPUTE', condition_confirmed_by_owner = 'ISSUE', owner_condition_notes = $1, actual_end_at = $2
       WHERE id = $3
       RETURNING *`,
      [data.notes || null, now.toISOString(), bookingId]
    );
    return mapBooking(updateRes.rows[0]);
  }

  const newStatus = 'RETURNED';
  const updateRes = await query(
    `UPDATE rental_bookings
       SET status = $1, condition_confirmed_by_owner = 'GOOD', actual_end_at = $2,
           early_refund_paise = $3
       WHERE id = $4
       RETURNING *`,
    [newStatus, now.toISOString(), calc.earlyRefundPaise, bookingId]
  );

  await sendNotification(
    booking.renter_id.toString(),
    'Item Returned in Good Condition!',
    `The owner verified the returned item in good condition. Settlement ready.`,
    'RENTAL_RETURNED',
    bookingId,
    { bookingId },
  );

  return mapBooking(updateRes.rows[0]);
}

export async function payOvertime(
  bookingId: string,
  renterId: string,
  societyId: string,
  data: PayOvertimeInput,
): Promise<RentalBookingDocument> {
  const bRes = await query('SELECT * FROM rental_bookings WHERE id = $1 AND renter_id = $2', [bookingId, renterId]);
  if (!bRes.rows[0]) throw new Error('Booking not found');

  const updateRes = await query(
    `UPDATE rental_bookings SET status = 'RETURNED' WHERE id = $1 RETURNING *`,
    [bookingId]
  );
  return mapBooking(updateRes.rows[0]);
}

export async function renterConfirmReturn(
  bookingId: string,
  renterId: string,
  societyId: string,
  data?: RenterConfirmInput,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND renter_id = $3`,
    [bookingId, societyId, renterId]
  );
  if (!bRes.rows[0]) throw new Error('Booking not found');
  return mapBooking(bRes.rows[0]);
}

export async function settleBooking(
  bookingId: string,
  userId: string,
  societyId: string,
): Promise<RentalBookingDocument> {
  const bRes = await query(
    `SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND status = 'RETURNED'`,
    [bookingId, societyId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or not in RETURNED state ready for settlement');

  const finalCharge = Number(booking.charge_paise || 0);
  const depositRefund = Number(booking.safe_deposit_paise || 0) + Number(booking.early_refund_paise || 0);

  const releaseKey = `rental-booking-release-${booking.id}`;
  const refundKey = `rental-booking-refund-${booking.id}`;

  if (finalCharge > 0) {
    await escrowService.release({
      ownerId: booking.owner_id.toString(),
      societyId,
      amountPaise: finalCharge,
      purpose: `Rental earnings for booking ${booking.id}`,
      referenceId: booking.id,
      idempotencyKey: releaseKey,
    });
  }

  if (depositRefund > 0) {
    await escrowService.refund({
      ownerId: booking.renter_id.toString(),
      societyId,
      amountPaise: depositRefund,
      purpose: `Safe deposit refund for booking ${booking.id}`,
      referenceId: booking.id,
      idempotencyKey: refundKey,
    });
  }

  const updateRes = await query(
    `UPDATE rental_bookings
     SET status = 'SETTLED', final_charge_released_paise = $1, deposit_refunded_paise = $2, settled_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [finalCharge, depositRefund, bookingId]
  );

  const updated = mapBooking(updateRes.rows[0]);

  await Promise.all([
    sendNotification(
      booking.owner_id.toString(),
      'Rental Earnings Settled!',
      `₹${(finalCharge / 100).toFixed(0)} has been released to your balance.`,
      'BOOKING_SETTLED',
      bookingId,
      { bookingId },
    ),
    sendNotification(
      booking.renter_id.toString(),
      'Deposit Refunded & Booking Closed',
      `Your safe deposit of ₹${(depositRefund / 100).toFixed(0)} has been refunded.`,
      'BOOKING_SETTLED',
      bookingId,
      { bookingId },
    ),
  ]);

  return updated;
}
