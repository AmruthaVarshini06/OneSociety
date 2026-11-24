import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface ServiceReviewDocument {
  id: string;
  _id: string;
  agreementId: string;
  requestId: string;
  seekerId: string;
  providerProfileId: string;
  providerUserId: string;
  societyId: string;
  reviewType: string;
  cyclePeriod?: string;
  overallRating: number;
  punctualityRating?: number;
  qualityRating?: number;
  behaviourRating?: number;
  comment?: string;
  wouldHireAgain?: boolean;
  reportedAbuse: boolean;
  abuseReason?: string;
  isRemovedByPresident: boolean;
  createdAt: Date;
}

function mapReview(row: any): ServiceReviewDocument {
  return {
    id: row.id,
    _id: row.id,
    agreementId: row.agreement_id,
    requestId: row.request_id,
    seekerId: row.seeker_id,
    providerProfileId: row.provider_profile_id,
    providerUserId: row.provider_user_id,
    societyId: row.society_id,
    reviewType: row.review_type,
    cyclePeriod: row.cycle_period,
    overallRating: Number(row.overall_rating),
    punctualityRating: row.punctuality_rating != null ? Number(row.punctuality_rating) : undefined,
    qualityRating: row.quality_rating != null ? Number(row.quality_rating) : undefined,
    behaviourRating: row.behaviour_rating != null ? Number(row.behaviour_rating) : undefined,
    comment: row.comment,
    wouldHireAgain: row.would_hire_again,
    reportedAbuse: !!row.reported_abuse,
    abuseReason: row.abuse_reason,
    isRemovedByPresident: !!row.is_removed_by_president,
    createdAt: new Date(row.created_at),
  };
}

export async function submitMidServiceReview(
  agreementId: string,
  visitId: string,
  seekerId: string,
  ratings: { overallRating: number; punctualityRating?: number; qualityRating?: number; behaviourRating?: number },
  comment?: string,
): Promise<ServiceReviewDocument> {
  const agRes = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  const ag = agRes.rows[0];
  if (!ag) throw Object.assign(new Error('Agreement not found'), { statusCode: 404 });
  if (ag.seeker_id.toString() !== seekerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

  // Get provider_profile_id
  const provRes = await query('SELECT id FROM service_providers WHERE user_id = $1 LIMIT 1', [ag.provider_user_id]);
  const providerProfileId = provRes.rows[0]?.id || ag.provider_user_id;

  const res = await query(
    `INSERT INTO service_reviews (
      agreement_id, request_id, seeker_id, provider_profile_id, provider_user_id, society_id,
      review_type, cycle_period, overall_rating, punctuality_rating, quality_rating,
      behaviour_rating, comment, reported_abuse, is_removed_by_president
    ) VALUES ($1, $2, $3, $4, $5, $6, 'MID_SERVICE', $7, $8, $9, $10, $11, $12, FALSE, FALSE)
    RETURNING *`,
    [
      ag.id,
      ag.request_id || ag.id,
      ag.seeker_id,
      providerProfileId,
      ag.provider_user_id,
      ag.society_id,
      visitId,
      ratings.overallRating,
      ratings.punctualityRating || null,
      ratings.qualityRating || null,
      ratings.behaviourRating || null,
      comment || null,
    ]
  );
  const review = res.rows[0];

  await sendNotification(
    ag.provider_user_id.toString(),
    'New mid-service review',
    `You received a ${ratings.overallRating}-star review.`,
    'SERVICE_REVIEW_RECEIVED',
    review.id.toString(),
    { reviewId: review.id.toString() },
  );

  return mapReview(review);
}

export async function submitFinalReview(
  agreementId: string,
  seekerId: string,
  ratings: { overallRating: number; punctualityRating?: number; qualityRating?: number; behaviourRating?: number },
  comment?: string,
  wouldHireAgain?: boolean,
): Promise<ServiceReviewDocument> {
  const agRes = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  const ag = agRes.rows[0];
  if (!ag) throw Object.assign(new Error('Agreement not found'), { statusCode: 404 });
  if (ag.seeker_id.toString() !== seekerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

  const provRes = await query('SELECT id FROM service_providers WHERE user_id = $1 LIMIT 1', [ag.provider_user_id]);
  const providerProfileId = provRes.rows[0]?.id || ag.provider_user_id;

  const res = await query(
    `INSERT INTO service_reviews (
      agreement_id, request_id, seeker_id, provider_profile_id, provider_user_id, society_id,
      review_type, overall_rating, punctuality_rating, quality_rating,
      behaviour_rating, comment, would_hire_again, reported_abuse, is_removed_by_president
    ) VALUES ($1, $2, $3, $4, $5, $6, 'FINAL', $7, $8, $9, $10, $11, $12, FALSE, FALSE)
    RETURNING *`,
    [
      ag.id,
      ag.request_id || ag.id,
      ag.seeker_id,
      providerProfileId,
      ag.provider_user_id,
      ag.society_id,
      ratings.overallRating,
      ratings.punctualityRating || null,
      ratings.qualityRating || null,
      ratings.behaviourRating || null,
      comment || null,
      wouldHireAgain ?? true,
    ]
  );
  const review = res.rows[0];

  // Recalculate average rating
  const allFinal = await query(
    `SELECT overall_rating FROM service_reviews WHERE provider_profile_id = $1 AND review_type = 'FINAL' AND is_removed_by_president = FALSE`,
    [providerProfileId]
  );
  if (allFinal.rows.length > 0) {
    const avg = allFinal.rows.reduce((s: number, r: any) => s + Number(r.overall_rating), 0) / allFinal.rows.length;
    await query(
      `UPDATE service_providers SET rating = $1 WHERE id = $2`,
      [Math.round(avg * 10) / 10, providerProfileId]
    ).catch(() => {});
  }

  await sendNotification(
    ag.provider_user_id.toString(),
    'Final review received',
    `You received a final ${ratings.overallRating}-star review.`,
    'SERVICE_REVIEW_FINAL',
    review.id.toString(),
    { reviewId: review.id.toString() },
  );

  return mapReview(review);
}

export async function reportAbuse(reviewId: string, reportedBy: string, reason: string): Promise<void> {
  const res = await query(
    `UPDATE service_reviews SET reported_abuse = TRUE, abuse_reason = $1 WHERE id = $2 RETURNING *`,
    [reason, reviewId]
  );
  const review = res.rows[0];
  if (!review) throw Object.assign(new Error('Review not found'), { statusCode: 404 });

  const presRes = await query(`SELECT id FROM users WHERE role = 'president' LIMIT 1`);
  const president = presRes.rows[0];
  if (president) {
    await sendNotification(
      president.id.toString(),
      'Review abuse reported',
      `A review has been reported for abuse. Reason: ${reason}`,
      'SERVICE_REVIEW_ABUSE',
      reviewId,
      { reviewId },
    );
  }
}

export async function removeReview(reviewId: string, presidentUserId: string): Promise<void> {
  const res = await query(
    `UPDATE service_reviews SET is_removed_by_president = TRUE WHERE id = $1`,
    [reviewId]
  );
  if (res.rowCount === 0) throw Object.assign(new Error('Review not found'), { statusCode: 404 });
}

export async function getProviderReviews(providerProfileId: string): Promise<ServiceReviewDocument[]> {
  const res = await query(
    `SELECT * FROM service_reviews WHERE provider_profile_id = $1 AND is_removed_by_president = FALSE ORDER BY created_at DESC`,
    [providerProfileId]
  );
  return res.rows.map(mapReview);
}
