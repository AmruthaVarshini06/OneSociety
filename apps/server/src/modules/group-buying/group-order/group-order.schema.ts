import { z } from 'zod';

const priceTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  pricePerUnit: z.number().int().positive(), // paise
});

// ── President creates a demand window ─────────────────────────────────────
export const createGroupOrderSchema = z.object({
  productName: z.string().min(2).max(100),
  productCategory: z.string().min(2).max(60),
  description: z.string().min(10).max(500),
  productImageUrl: z.string().url().optional(),
  unit: z.string().min(1).max(20).default('piece'),
  minimumQuantity: z.number().int().min(1),
  demandCloseAt: z
    .string()
    .datetime({ offset: true })
    .refine((d) => new Date(d) > new Date(), {
      message: 'demandCloseAt must be in the future',
    }),
});

export type CreateGroupOrderInput = z.infer<typeof createGroupOrderSchema>;

// ── List query ────────────────────────────────────────────────────────────
export const listGroupOrdersQuerySchema = z.object({
  status: z
    .enum([
      'DEMAND_OPEN',
      'OFFERS_OPEN',
      'SUPPLIER_SELECTED',
      'GROUP_ORDER_OPEN',
      'PAYMENT_WINDOW',
      'DELIVERY_PENDING',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'FAILED',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListGroupOrdersQuery = z.infer<typeof listGroupOrdersQuerySchema>;

// ── Cancel a demand window (president) ───────────────────────────────────
export const cancelGroupOrderSchema = z.object({
  reason: z.string().min(5).max(200),
});

export type CancelGroupOrderInput = z.infer<typeof cancelGroupOrderSchema>;

// ── Open payment window (president) ───────────────────────────────────────
export const openPaymentWindowSchema = z.object({
  paymentDeadlineHours: z.number().int().min(1).max(168).default(48), // default 48h, max 7 days
});

export type OpenPaymentWindowInput = z.infer<typeof openPaymentWindowSchema>;
