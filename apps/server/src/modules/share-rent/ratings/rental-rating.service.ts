import { query } from '../../../config/supabase';
import * as auditService from '../../../shared/audit/audit.service';
import type { CreateRatingInput } from './rental-rating.schema';

export interface RentalRatingDocument {
  id: string;
  _id: string;
  bookingId: string;
  itemId: string;
  societyId: string;
  raterId: any;
  rateeId: any;
  raterRole: string;
  stars: number;
  itemConditionStars?: number;
  valueForMoneyStars?: number;
  comment?: string;
  createdAt: Date;
}

function mapRating(row: any): RentalRatingDocument {
  return {
    id: row.id,
    _id: row.id,
    bookingId: row.booking_id,
    itemId: row.item_id,
    societyId: row.society_id,
    raterId: row.rater_username ? { id: row.rater_id, _id: row.rater_id, username: row.rater_username } : row.rater_id,
    rateeId: row.ratee_username ? { id: row.target_user_id, _id: row.target_user_id, username: row.ratee_username } : row.target_user_id,
    raterRole: row.rater_role || 'RENTER',
    stars: Number(row.rating || 5),
    comment: row.review,
    createdAt: new Date(row.created_at),
  };
}

export async function submitRating(
  bookingId: string,
  raterId: string,
  societyId: string,
  data: CreateRatingInput,
): Promise<RentalRatingDocument> {
  const bRes = await query('SELECT * FROM rental_bookings WHERE id = $1', [bookingId]);
  const booking = bRes.rows[0];
  if (!booking) {
    throw new Error('Booking not found or not yet returned/settled');
  }

  const isRenter = booking.renter_id.toString() === raterId;
  const isOwner = booking.owner_id.toString() === raterId;

  if (!isRenter && !isOwner) {
    throw new Error('Only the renter or owner can submit a review for this booking');
  }

  const raterRole = isRenter ? 'RENTER' : 'OWNER';
  const targetUserId = isRenter ? booking.owner_id : booking.renter_id;

  const existingRes = await query(
    'SELECT * FROM rental_ratings WHERE booking_id = $1 AND rater_id = $2',
    [bookingId, raterId]
  );

  let ratingRow: any;
  if (existingRes.rows[0]) {
    const updateRes = await query(
      `UPDATE rental_ratings SET rating = $1, review = $2 WHERE id = $3 RETURNING *`,
      [data.stars, data.comment || '', existingRes.rows[0].id]
    );
    ratingRow = updateRes.rows[0];
  } else {
    const insertRes = await query(
      `INSERT INTO rental_ratings (booking_id, item_id, rater_id, target_user_id, rating, review)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [booking.id, booking.item_id, raterId, targetUserId, data.stars, data.comment || '']
    );
    ratingRow = insertRes.rows[0];
  }

  auditService.log(raterId, societyId, 'RATING_SUBMITTED', ratingRow.id, 'RentalRating', {
    stars: data.stars,
    role: raterRole,
  });

  return mapRating(ratingRow);
}

export async function getRatingsForBooking(bookingId: string) {
  const res = await query(
    `SELECT rr.*, ru.username as rater_username, tu.username as ratee_username
     FROM rental_ratings rr
     LEFT JOIN users ru ON ru.id = rr.rater_id
     LEFT JOIN users tu ON tu.id = rr.target_user_id
     WHERE rr.booking_id = $1`,
    [bookingId]
  );
  return res.rows.map(mapRating);
}

export async function getRatingsForItem(itemId: string) {
  const res = await query(
    `SELECT rr.*, ru.username as rater_username
     FROM rental_ratings rr
     LEFT JOIN users ru ON ru.id = rr.rater_id
     WHERE rr.item_id = $1
     ORDER BY rr.created_at DESC
     LIMIT 20`,
    [itemId]
  );
  return res.rows.map(mapRating);
}
