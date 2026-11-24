import { z } from 'zod';

export const verifyPriceSchema = z
  .object({
    name: z.string().min(2).max(100),
    category: z.string().min(2).max(50),
    ageYears: z.number().min(0).default(0),
    condition: z.enum(['LIKE_NEW', 'GOOD', 'FAIR', 'HEAVILY_USED']).default('GOOD'),
    estimatedPurchasePricePaise: z.number().int().min(0).optional(),
    chargeHourlyPaise: z.number().int().min(0).optional(),
    chargeDailyPaise: z.number().int().min(0).optional(),
    safeDepositPaise: z.number().int().min(0),
  })
  .refine(
    (data) => (data.chargeHourlyPaise && data.chargeHourlyPaise > 0) || (data.chargeDailyPaise && data.chargeDailyPaise > 0),
    { message: 'At least one rate (hourly or daily) must be specified' },
  );

export type VerifyPriceInput = z.infer<typeof verifyPriceSchema>;

export const createRentalItemSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    category: z.string().min(2, 'Category is required').max(50),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
    photos: z.array(z.string()).min(1, 'At least 1 baseline condition photo is required'),
    ageYears: z.number().min(0).default(0),
    condition: z.enum(['LIKE_NEW', 'GOOD', 'FAIR', 'HEAVILY_USED']).default('GOOD'),
    estimatedPurchasePricePaise: z.number().int().min(0).optional(),
    pickupLocation: z.string().min(2, 'Pickup location is required').max(100),
    chargeHourlyPaise: z.number().int().min(0).optional(),
    chargeDailyPaise: z.number().int().min(0).optional(),
    safeDepositPaise: z.number().int().min(0, 'Deposit must be non-negative'),
    usageRules: z.array(z.string()).default([]),
  })
  .refine(
    (data) => (data.chargeHourlyPaise && data.chargeHourlyPaise > 0) || (data.chargeDailyPaise && data.chargeDailyPaise > 0),
    { message: 'At least one rate (hourly or daily) must be specified' },
  );

export type CreateRentalItemInput = z.infer<typeof createRentalItemSchema>;

export const updateRentalItemSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(2).max(50).optional(),
  description: z.string().min(10).max(1000).optional(),
  photos: z.array(z.string()).min(1).optional(),
  ageYears: z.number().min(0).optional(),
  condition: z.enum(['LIKE_NEW', 'GOOD', 'FAIR', 'HEAVILY_USED']).optional(),
  estimatedPurchasePricePaise: z.number().int().min(0).optional(),
  pickupLocation: z.string().min(2).max(100).optional(),
  chargeHourlyPaise: z.number().int().min(0).optional(),
  chargeDailyPaise: z.number().int().min(0).optional(),
  safeDepositPaise: z.number().int().min(0).optional(),
  usageRules: z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
});

export type UpdateRentalItemInput = z.infer<typeof updateRentalItemSchema>;

export const listRentalItemsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListRentalItemsQuery = z.infer<typeof listRentalItemsQuerySchema>;

export const presidentReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(3).max(200),
});

export type PresidentReviewInput = z.infer<typeof presidentReviewSchema>;
