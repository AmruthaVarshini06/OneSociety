import apiClient from '../api/client';

export interface RentalRating {
  _id: string;
  bookingId: string;
  itemId: string;
  societyId: string;
  raterId: string | { _id: string; username: string };
  rateeId: string | { _id: string; username: string };
  raterRole: 'RENTER' | 'OWNER';
  stars: number;
  itemConditionStars?: number;
  valueForMoneyStars?: number;
  comment?: string;
  createdAt: string;
}

export interface SubmitRatingPayload {
  stars: number;
  itemConditionStars?: number;
  valueForMoneyStars?: number;
  comment?: string;
}

export async function submitRating(
  bookingId: string,
  payload: SubmitRatingPayload,
): Promise<RentalRating> {
  const res = await apiClient.post<{ success: boolean; data: RentalRating }>(
    `/api/v1/rentals/ratings/bookings/${bookingId}`,
    payload,
  );
  return res.data.data;
}

export async function getRatingsForBooking(bookingId: string): Promise<RentalRating[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalRating[] }>(
    `/api/v1/rentals/ratings/bookings/${bookingId}`,
  );
  return res.data.data;
}

export async function getRatingsForItem(itemId: string): Promise<RentalRating[]> {
  const res = await apiClient.get<{ success: boolean; data: RentalRating[] }>(
    `/api/v1/rentals/ratings/items/${itemId}`,
  );
  return res.data.data;
}
