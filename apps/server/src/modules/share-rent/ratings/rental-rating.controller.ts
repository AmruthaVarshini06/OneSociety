import type { Request, Response } from 'express';
import * as ratingService from './rental-rating.service';
import { createRatingSchema } from './rental-rating.schema';

export async function submitRating(req: Request, res: Response): Promise<void> {
  const validated = createRatingSchema.parse(req.body);
  const rating = await ratingService.submitRating(
    req.params.bookingId,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.status(201).json({ success: true, data: rating });
}

export async function getRatingsForBooking(req: Request, res: Response): Promise<void> {
  const ratings = await ratingService.getRatingsForBooking(req.params.bookingId);
  res.json({ success: true, data: ratings });
}

export async function getRatingsForItem(req: Request, res: Response): Promise<void> {
  const ratings = await ratingService.getRatingsForItem(req.params.itemId);
  res.json({ success: true, data: ratings });
}
