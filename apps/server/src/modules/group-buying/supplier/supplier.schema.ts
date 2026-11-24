import { z } from 'zod';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const gstNumberSchema = z
  .string()
  .toUpperCase()
  .regex(GST_REGEX, 'Invalid GSTIN format (expected 15-character GSTIN)');

export const createSupplierSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username must be lowercase alphanumeric with underscores'),
  tempPassword: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2).max(100),
  contactName: z.string().min(2).max(60),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  gstNumber: gstNumberSchema.optional(),
  idDocumentUrl: z.string().url().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  contactName: z.string().min(2).max(60).optional(),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional(),
  gstNumber: gstNumberSchema.optional(),
  idDocumentUrl: z.string().url().optional(),
});

export type UpdateSupplierProfileInput = z.infer<typeof updateSupplierProfileSchema>;

export const verifySupplierSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    note: z.string().max(500).optional(),
  })
  .refine(
    (d) => !(d.action === 'reject' && (!d.note || d.note.trim().length === 0)),
    { message: 'A rejection note is required', path: ['note'] },
  );

export type VerifySupplierInput = z.infer<typeof verifySupplierSchema>;

export const listSuppliersQuerySchema = z.object({
  status: z
    .enum(['PENDING_REVIEW', 'GST_VERIFIED', 'APPROVED', 'REJECTED'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
