import { z } from 'zod';

export const createItemRequestSchema = z.object({
  itemName: z.string().min(2, 'Item name must be at least 2 characters').max(100),
  category: z.string().min(2, 'Category is required').max(50),
  purpose: z.string().max(300).optional(),
  neededFrom: z.coerce.date(),
  durationValue: z.number().int().min(1, 'Duration must be at least 1'),
  durationType: z.enum(['HOURS', 'DAYS']).default('HOURS'),
  budgetPaise: z.number().int().min(0).optional(),
});

export type CreateItemRequestInput = z.infer<typeof createItemRequestSchema>;

export const createItemOfferSchema = z
  .object({
    existingItemId: z.string().optional(),
    itemName: z.string().min(2, 'Item name must be at least 2 characters').max(100),
    photos: z.array(z.string()).default([]),
    condition: z.enum(['LIKE_NEW', 'GOOD', 'FAIR', 'HEAVILY_USED']).default('GOOD'),
    chargeHourlyPaise: z.number().int().min(0).optional(),
    chargeDailyPaise: z.number().int().min(0).optional(),
    safeDepositPaise: z.number().int().min(0, 'Deposit must be non-negative'),
    message: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      (data.chargeHourlyPaise && data.chargeHourlyPaise > 0) ||
      (data.chargeDailyPaise && data.chargeDailyPaise > 0),
    { message: 'At least one rate (hourly or daily) must be specified' },
  );

export type CreateItemOfferInput = z.infer<typeof createItemOfferSchema>;

export const listItemRequestsQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(['OPEN', 'FULFILLED', 'CANCELLED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListItemRequestsQuery = z.infer<typeof listItemRequestsQuerySchema>;
