import { z } from 'zod';
export const DISPUTE_CATEGORIES = [
  'DAMAGE',
  'MISSING_PART',
  'NOT_CLEAN',
  'LATE_RETURN',
  'OTHER',
] as const;

export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];

export const createDisputeSchema = z.object({
  claimedAmountPaise: z.number().int().min(0, 'Claim amount must be non-negative'),
  issueCategory: z.enum(DISPUTE_CATEGORIES),
  description: z.string().min(5, 'Please provide issue description').max(1000),
  evidencePhotos: z.array(z.string().min(1)).optional().default([]),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const respondDisputeSchema = z.object({
  action: z.enum(['ACCEPT', 'CONTEST']),
  counterNote: z.string().max(1000).optional(),
});

export type RespondDisputeInput = z.infer<typeof respondDisputeSchema>;

export const resolvePresidentSchema = z.object({
  ownerAmountPaise: z.number().int().min(0, 'Owner amount must be non-negative'),
  renterRefundPaise: z.number().int().min(0, 'Renter refund must be non-negative'),
  decisionReason: z.string().min(5, 'President must provide a reason').max(1000),
});

export type ResolvePresidentInput = z.infer<typeof resolvePresidentSchema>;
