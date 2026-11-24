import apiClient from '../api/client';

export const submitReview = (data: {
  agreementId: string;
  visitId?: string;
  reviewType: 'MID_SERVICE' | 'FINAL';
  overallRating: number;
  punctualityRating?: number;
  qualityRating?: number;
  behaviourRating?: number;
  comment?: string;
  wouldHireAgain?: boolean;
}) =>
  apiClient.post('/api/v1/services/reviews', data);

export const getProviderReviews = (profileId: string) =>
  apiClient.get(`/api/v1/services/reviews/provider/${profileId}`);

export const reportReviewAbuse = (reviewId: string, reason: string) =>
  apiClient.patch(`/api/v1/services/reviews/${reviewId}/report-abuse`, { reason });

export const removeReview = (reviewId: string) =>
  apiClient.delete(`/api/v1/services/reviews/${reviewId}`);
