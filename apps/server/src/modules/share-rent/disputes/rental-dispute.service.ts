import { query } from '../../../config/supabase';
import * as escrowService from '../../../shared/escrow/escrow.service';
import * as auditService from '../../../shared/audit/audit.service';
import { sendNotification } from '../../../shared/notifications/notification.service';
import type {
  CreateDisputeInput,
  RespondDisputeInput,
  ResolvePresidentInput,
} from './rental-dispute.schema';

export interface RentalDisputeDocument {
  id: string;
  _id: string;
  bookingId: string;
  societyId: string;
  ownerId: any;
  renterId: any;
  claimedAmountPaise: number;
  issueCategory: string;
  ownerDescription: string;
  ownerEvidencePhotos?: string[];
  status: string;
  renterResponse: string;
  renterCounterNote?: string;
  settlementSplit?: any;
  presidentDecision?: any;
  escalatedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

function mapDispute(row: any): RentalDisputeDocument {
  const photos = Array.isArray(row.evidence_photos) ? row.evidence_photos : typeof row.evidence_photos === 'string' ? JSON.parse(row.evidence_photos) : [];
  return {
    id: row.id,
    _id: row.id,
    bookingId: row.booking_id,
    societyId: row.society_id,
    ownerId: row.owner_username ? { id: row.owner_id, _id: row.owner_id, username: row.owner_username } : row.owner_id,
    renterId: row.renter_username ? { id: row.renter_id, _id: row.renter_id, username: row.renter_username } : row.renter_id,
    claimedAmountPaise: Number(row.claimed_amount_paise || 0),
    issueCategory: row.category,
    ownerDescription: row.description,
    ownerEvidencePhotos: photos,
    status: row.status,
    renterResponse: row.renter_response || 'PENDING',
    renterCounterNote: row.renter_counter_note,
    settlementSplit: row.settlement_split,
    presidentDecision: row.president_decision,
    escalatedAt: row.escalated_at ? new Date(row.escalated_at) : undefined,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function createDispute(
  bookingId: string,
  ownerId: string,
  societyId: string,
  data: CreateDisputeInput,
): Promise<RentalDisputeDocument> {
  const bRes = await query(
    'SELECT * FROM rental_bookings WHERE id = $1 AND society_id = $2 AND owner_id = $3',
    [bookingId, societyId, ownerId]
  );
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found or you are not the owner');

  const safeDeposit = Number(booking.safe_deposit_paise || 0);
  if (data.claimedAmountPaise > safeDeposit) {
    throw new Error(
      `Claim amount (₹${(data.claimedAmountPaise / 100).toFixed(0)}) cannot exceed the safe deposit amount (₹${(safeDeposit / 100).toFixed(0)})`,
    );
  }

  const existingRes = await query('SELECT id FROM rental_disputes WHERE booking_id = $1', [bookingId]);
  if (existingRes.rows[0]) {
    throw new Error('A dispute is already open for this booking');
  }

  const res = await query(
    `INSERT INTO rental_disputes (
      booking_id, society_id, owner_id, renter_id, raised_by,
      claimed_amount_paise, category, description, evidence_photos,
      status, renter_response
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN', 'PENDING')
    RETURNING *`,
    [
      bookingId,
      societyId,
      booking.owner_id,
      booking.renter_id,
      ownerId,
      data.claimedAmountPaise,
      data.issueCategory,
      data.description,
      JSON.stringify(data.evidencePhotos || []),
    ]
  );
  const dispute = mapDispute(res.rows[0]);

  await query(
    `UPDATE rental_bookings
     SET status = 'IN_DISPUTE', condition_confirmed_by_owner = 'ISSUE', owner_condition_notes = $1
     WHERE id = $2`,
    [data.description, bookingId]
  );

  auditService.log(ownerId, societyId, 'DISPUTE_FILED', dispute.id, 'RentalDispute', {
    claimedAmountPaise: data.claimedAmountPaise,
    category: data.issueCategory,
  });

  await sendNotification(
    booking.renter_id.toString(),
    'Dispute Raised by Owner',
    `The owner filed a damage claim of ₹${(data.claimedAmountPaise / 100).toFixed(0)} for "${data.issueCategory.replace(/_/g, ' ')}". Safe deposit is held. Please review and respond.`,
    'RENTAL_DISPUTE_RAISED',
    bookingId,
    { bookingId, disputeId: dispute.id },
  );

  return dispute;
}

export async function respondToDispute(
  bookingId: string,
  renterId: string,
  societyId: string,
  data: RespondDisputeInput,
): Promise<RentalDisputeDocument> {
  const dRes = await query(
    `SELECT * FROM rental_disputes WHERE booking_id = $1 AND society_id = $2 AND renter_id = $3 AND status = 'OPEN'`,
    [bookingId, societyId, renterId]
  );
  const dispute = dRes.rows[0];
  if (!dispute) throw new Error('Open dispute not found or you are not the renter');

  const bRes = await query('SELECT * FROM rental_bookings WHERE id = $1', [bookingId]);
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Associated booking not found');

  if (data.action === 'ACCEPT') {
    const ownerClaim = Number(dispute.claimed_amount_paise || 0);
    const finalRentalCharge = Number(booking.final_charge_released_paise || booking.charge_paise || 0);
    const safeDeposit = Number(booking.safe_deposit_paise || 0);
    const renterDepositRefund = Math.max(0, safeDeposit - ownerClaim);
    const earlyRefund = Number(booking.early_refund_paise || 0);
    const totalRenterRefund = renterDepositRefund + earlyRefund;

    const deductKey = `rental-dispute-deduct-${dispute.id}`;
    const releaseKey = `rental-dispute-release-${dispute.id}`;
    const refundKey = `rental-dispute-refund-${dispute.id}`;

    if (finalRentalCharge > 0) {
      await escrowService.release({
        ownerId: booking.owner_id.toString(),
        societyId,
        amountPaise: finalRentalCharge,
        purpose: `Rental charge release for booking ${booking.id}`,
        referenceId: booking.id,
        idempotencyKey: releaseKey,
      });
    }

    if (ownerClaim > 0) {
      await escrowService.deduct({
        ownerId: booking.renter_id.toString(),
        societyId,
        amountPaise: ownerClaim,
        purpose: `Damage claim deduction for booking ${booking.id}`,
        referenceId: dispute.id,
        idempotencyKey: deductKey,
      });
    }

    if (totalRenterRefund > 0) {
      await escrowService.refund({
        ownerId: booking.renter_id.toString(),
        societyId,
        amountPaise: totalRenterRefund,
        purpose: `Deposit remainder refund for booking ${booking.id}`,
        referenceId: booking.id,
        idempotencyKey: refundKey,
      });
    }

    const split = {
      ownerAmountPaise: finalRentalCharge + ownerClaim,
      renterRefundPaise: totalRenterRefund,
    };

    const updateD = await query(
      `UPDATE rental_disputes
       SET renter_response = 'ACCEPTED', status = 'RESOLVED_MUTUAL', settlement_split = $1, resolved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(split), dispute.id]
    );

    await query(
      `UPDATE rental_bookings
       SET status = 'SETTLED', final_charge_released_paise = $1, deposit_refunded_paise = $2,
           extra_charge_paise = $3, settled_at = NOW()
       WHERE id = $4`,
      [finalRentalCharge + ownerClaim, totalRenterRefund, ownerClaim, booking.id]
    );

    auditService.log(renterId, societyId, 'DISPUTE_MUTUALLY_RESOLVED', dispute.id, 'RentalDispute', {
      ownerClaim,
      totalRenterRefund,
    });

    await Promise.all([
      sendNotification(
        booking.owner_id.toString(),
        'Dispute Accepted & Settled',
        `The renter accepted your claim of ₹${(ownerClaim / 100).toFixed(0)}. ₹${((finalRentalCharge + ownerClaim) / 100).toFixed(0)} has been released to you.`,
        'DISPUTE_RESOLVED',
        booking.id,
        { bookingId: booking.id },
      ),
      sendNotification(
        booking.renter_id.toString(),
        'Dispute Settlement Completed',
        `Claim accepted. Remaining refund of ₹${(totalRenterRefund / 100).toFixed(0)} has been returned to your account.`,
        'DISPUTE_RESOLVED',
        booking.id,
        { bookingId: booking.id },
      ),
    ]);

    return mapDispute(updateD.rows[0]);
  }

  // CONTEST
  const updateContest = await query(
    `UPDATE rental_disputes
     SET renter_response = 'CONTESTED', renter_counter_note = $1, status = 'ESCALATED', escalated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [data.counterNote || null, dispute.id]
  );

  auditService.log(renterId, societyId, 'DISPUTE_CONTESTED', dispute.id, 'RentalDispute', {
    note: data.counterNote,
  });

  await sendNotification(
    booking.owner_id.toString(),
    'Dispute Contested by Renter',
    `The renter contested your claim: "${data.counterNote ?? 'No details provided'}". Case escalated to the Society President.`,
    'DISPUTE_ESCALATED',
    booking.id,
    { bookingId: booking.id },
  );

  return mapDispute(updateContest.rows[0]);
}

export async function escalateDispute(
  bookingId: string,
  userId: string,
  societyId: string,
): Promise<RentalDisputeDocument> {
  const res = await query(
    `UPDATE rental_disputes
     SET status = 'ESCALATED', escalated_at = NOW()
     WHERE booking_id = $1 AND society_id = $2 AND status IN ('OPEN', 'ESCALATED')
     RETURNING *`,
    [bookingId, societyId]
  );
  if (!res.rows[0]) throw new Error('Active dispute not found');

  const dispute = mapDispute(res.rows[0]);
  auditService.log(userId, societyId, 'DISPUTE_ESCALATED_PRESIDENT', dispute.id, 'RentalDispute');
  return dispute;
}

export async function resolveDisputeByPresident(
  bookingId: string,
  presidentId: string,
  societyId: string,
  data: ResolvePresidentInput,
): Promise<RentalDisputeDocument> {
  const dRes = await query(
    `SELECT * FROM rental_disputes WHERE booking_id = $1 AND society_id = $2 AND status IN ('OPEN', 'ESCALATED')`,
    [bookingId, societyId]
  );
  const dispute = dRes.rows[0];
  if (!dispute) throw new Error('Active dispute not found');

  const bRes = await query('SELECT * FROM rental_bookings WHERE id = $1', [bookingId]);
  const booking = bRes.rows[0];
  if (!booking) throw new Error('Booking not found');

  const finalRentalCharge = Number(booking.final_charge_released_paise || booking.charge_paise || 0);
  const totalHeldDeposit = Number(booking.safe_deposit_paise || 0);

  if (data.ownerAmountPaise + data.renterRefundPaise > totalHeldDeposit + finalRentalCharge) {
    throw new Error('Total distribution exceeds total funds held in escrow');
  }

  const presidentKey = `rental-dispute-pres-${dispute.id}-${Date.now()}`;

  if (data.ownerAmountPaise > 0) {
    await escrowService.release({
      ownerId: booking.owner_id.toString(),
      societyId,
      amountPaise: data.ownerAmountPaise,
      purpose: `Presidential ruling payout for booking ${booking.id}`,
      referenceId: dispute.id,
      idempotencyKey: `${presidentKey}-owner`,
    });
  }

  if (data.renterRefundPaise > 0) {
    await escrowService.refund({
      ownerId: booking.renter_id.toString(),
      societyId,
      amountPaise: data.renterRefundPaise,
      purpose: `Presidential ruling refund for booking ${booking.id}`,
      referenceId: dispute.id,
      idempotencyKey: `${presidentKey}-renter`,
    });
  }

  const presDecision = {
    decidedBy: presidentId,
    decisionReason: data.decisionReason,
    decidedAt: new Date().toISOString(),
  };

  const updateRes = await query(
    `UPDATE rental_disputes
     SET status = 'RESOLVED_PRESIDENT', settlement_split = $1, president_decision = $2, resolved_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [JSON.stringify({ ownerAmountPaise: data.ownerAmountPaise, renterRefundPaise: data.renterRefundPaise }), JSON.stringify(presDecision), dispute.id]
  );

  await query(
    `UPDATE rental_bookings
     SET status = 'SETTLED', final_charge_released_paise = $1, deposit_refunded_paise = $2, settled_at = NOW()
     WHERE id = $3`,
    [data.ownerAmountPaise, data.renterRefundPaise, booking.id]
  );

  auditService.log(presidentId, societyId, 'PRESIDENT_DISPUTE_RULED', dispute.id, 'RentalDispute', {
    ownerAmountPaise: data.ownerAmountPaise,
    renterRefundPaise: data.renterRefundPaise,
    reason: data.decisionReason,
  });

  await Promise.all([
    sendNotification(
      booking.owner_id.toString(),
      'Presidential Ruling Issued',
      `President ruled on rental dispute: ₹${(data.ownerAmountPaise / 100).toFixed(0)} awarded to you. Reason: ${data.decisionReason}.`,
      'PRESIDENT_RULING',
      booking.id,
      { bookingId: booking.id },
    ),
    sendNotification(
      booking.renter_id.toString(),
      'Presidential Ruling Issued',
      `President ruled on rental dispute: ₹${(data.renterRefundPaise / 100).toFixed(0)} refunded to you. Reason: ${data.decisionReason}.`,
      'PRESIDENT_RULING',
      booking.id,
      { bookingId: booking.id },
    ),
  ]);

  return mapDispute(updateRes.rows[0]);
}

export async function getDisputeByBookingId(
  bookingId: string,
  userId: string,
  role: string,
  societyId: string,
): Promise<RentalDisputeDocument | null> {
  const res = await query(
    `SELECT rd.*, ou.username as owner_username, ru.username as renter_username
     FROM rental_disputes rd
     LEFT JOIN users ou ON ou.id = rd.owner_id
     LEFT JOIN users ru ON ru.id = rd.renter_id
     WHERE rd.booking_id = $1 AND rd.society_id = $2`,
    [bookingId, societyId]
  );
  if (!res.rows[0]) return null;
  const dispute = mapDispute(res.rows[0]);

  const isOwner = dispute.ownerId?.id?.toString() === userId || dispute.ownerId?.toString() === userId;
  const isRenter = dispute.renterId?.id?.toString() === userId || dispute.renterId?.toString() === userId;
  const isPresident = role === 'president';

  if (!isOwner && !isRenter && !isPresident) {
    throw new Error('Not authorized to view this dispute');
  }

  return dispute;
}

export async function listPendingDisputes(societyId: string) {
  const res = await query(
    `SELECT rd.*, ou.username as owner_username, ru.username as renter_username
     FROM rental_disputes rd
     LEFT JOIN users ou ON ou.id = rd.owner_id
     LEFT JOIN users ru ON ru.id = rd.renter_id
     WHERE rd.society_id = $1 AND rd.status IN ('OPEN', 'ESCALATED')
     ORDER BY rd.created_at DESC`,
    [societyId]
  );
  return res.rows.map(mapDispute);
}
