import { z } from 'zod';

export const dispatchOrderSchema = z.object({
  promisedDeliveryDate: z
    .string()
    .datetime({ offset: true })
    .refine((d) => new Date(d) > new Date(Date.now() - 3600_000), {
      message: 'promisedDeliveryDate must be today or in the future',
    }),
  deliveryType: z.enum(['SOCIETY_GATE', 'DOOR_TO_DOOR']).default('SOCIETY_GATE'),
  storageLocation: z.string().min(2).max(100).default('Society Gate Storage'),
  totalPackagesDeclared: z.number().int().min(1),
});

export type DispatchOrderInput = z.infer<typeof dispatchOrderSchema>;

export const gateAcceptSchema = z.object({
  packagesReceived: z.number().int().min(0),
  notes: z.string().max(200).optional(),
});

export type GateAcceptInput = z.infer<typeof gateAcceptSchema>;

export const verifyQrSchema = z.object({
  qrToken: z.string().min(10, 'QR token is required'),
});

export type VerifyQrInput = z.infer<typeof verifyQrSchema>;

export const requestOtpSchema = z.object({
  flatId: z.string().min(1, 'Flat ID is required'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  flatId: z.string().min(1, 'Flat ID is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  overrideReason: z.string().min(3).max(200, 'Reason must be between 3 and 200 characters'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
