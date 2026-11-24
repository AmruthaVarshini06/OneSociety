import { z } from 'zod';

export const createIssueSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  issueType: z.enum(['QUALITY', 'QUANTITY_SHORT', 'MISSING_ITEM']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  photoUrls: z.array(z.string()).default([]),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const supplierResponseSchema = z.object({
  action: z.enum(['REFUND', 'REPLACEMENT', 'REJECT']),
  note: z.string().max(300).optional(),
  replacementDate: z.string().datetime({ offset: true }).optional(),
});

export type SupplierResponseInput = z.infer<typeof supplierResponseSchema>;

export const presidentResolutionSchema = z.object({
  decision: z.enum(['REFUND', 'REPLACEMENT', 'DISMISS']),
  note: z.string().max(300).optional(),
});

export type PresidentResolutionInput = z.infer<typeof presidentResolutionSchema>;

export const submitRatingSchema = z.object({
  productRating: z.number().int().min(1).max(5),
  productComment: z.string().max(300).optional(),
  supplierRating: z.number().int().min(1).max(5),
  supplierComment: z.string().max(300).optional(),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
