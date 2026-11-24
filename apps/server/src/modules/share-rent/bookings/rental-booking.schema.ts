import { z } from 'zod';

export const createBookingSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  billingUnit: z.enum(['HOUR', 'DAY']),
  bookedUnits: z.number().int().min(1, 'Must book at least 1 unit'),
  startAt: z.coerce.date(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const respondBookingSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  declineReason: z.string().max(300).optional(),
});

export type RespondBookingInput = z.infer<typeof respondBookingSchema>;

export const payBookingSchema = z.object({
  // In a real app this carries a Razorpay payment ID; we mock it
  paymentId: z.string().optional().default('mock_payment'),
});

export type PayBookingInput = z.infer<typeof payBookingSchema>;

// Phase 4 Schemas

export const uploadPickupPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        url: z.string().min(1, 'Photo URL or base64 is required'),
        timestamp: z.coerce.date().optional(),
        caption: z.string().max(200).optional(),
      }),
    )
    .min(1, 'Must provide at least one photo'),
});

export type UploadPickupPhotosInput = z.infer<typeof uploadPickupPhotosSchema>;

export const confirmHandoverSchema = z.object({
  ownerPhotos: z
    .array(
      z.object({
        url: z.string().min(1, 'Photo URL or base64 is required'),
        timestamp: z.coerce.date().optional(),
        caption: z.string().max(200).optional(),
      }),
    )
    .optional(),
});

export type ConfirmHandoverInput = z.infer<typeof confirmHandoverSchema>;

export const requestExtensionSchema = z.object({
  additionalUnits: z.number().int().min(1, 'Must request at least 1 unit'),
});

export type RequestExtensionInput = z.infer<typeof requestExtensionSchema>;

export const respondExtensionSchema = z.object({
  action: z.enum(['APPROVE', 'DECLINE']),
});

export type RespondExtensionInput = z.infer<typeof respondExtensionSchema>;

export const payExtensionSchema = z.object({
  paymentId: z.string().optional().default('mock_payment'),
});

export type PayExtensionInput = z.infer<typeof payExtensionSchema>;

// Phase 5 Schemas

export const uploadReturnPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        url: z.string().min(1, 'Photo URL or base64 is required'),
        timestamp: z.coerce.date().optional(),
        caption: z.string().max(200).optional(),
      }),
    )
    .min(1, 'Must provide at least one photo'),
});

export type UploadReturnPhotosInput = z.infer<typeof uploadReturnPhotosSchema>;

export const confirmReturnSchema = z.object({
  condition: z.enum(['GOOD', 'ISSUE']),
  notes: z.string().max(500).optional(),
});

export type ConfirmReturnInput = z.infer<typeof confirmReturnSchema>;

export const payOvertimeSchema = z.object({
  method: z.enum(['DIRECT_PAYMENT', 'DEDUCT_FROM_DEPOSIT']),
  paymentId: z.string().optional().default('mock_payment'),
});

export type PayOvertimeInput = z.infer<typeof payOvertimeSchema>;

export const renterConfirmSchema = z.object({
  satisfactionNotes: z.string().max(500).optional(),
});

export type RenterConfirmInput = z.infer<typeof renterConfirmSchema>;

export const listBookingsQuerySchema = z.object({
  role: z.enum(['renter', 'owner', 'all']).default('all'),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
