import { z } from 'zod';

export const confirmPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
