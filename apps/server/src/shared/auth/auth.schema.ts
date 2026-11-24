import { z } from 'zod';
import { ROLES } from './roles';

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export const CreateAccountSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  role: z.enum(ROLES),
  email: z.string().email().optional(),
  flatId: z.string().optional(),
});

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

export const FcmTokenSchema = z.object({
  fcmToken: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type FcmTokenInput = z.infer<typeof FcmTokenSchema>;
