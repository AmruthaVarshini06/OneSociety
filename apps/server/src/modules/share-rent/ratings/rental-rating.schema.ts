import { z } from 'zod';

export const createRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  itemConditionStars: z.number().int().min(1).max(5).optional(),
  valueForMoneyStars: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
