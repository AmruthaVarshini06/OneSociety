import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { createToken, verifyToken, QrTokenType } from './qr.service';

const router = Router();

const CreateQrSchema = z.object({
  type: z.enum(['delivery_pass', 'visitor_pass', 'resident_pass']),
  issuedTo: z.string().min(1),
  ttlSeconds: z.number().int().positive().max(86400 * 7),
  referenceId: z.string().optional(),
  isSingleUse: z.boolean().optional().default(false),
});

const VerifyQrSchema = z.object({
  token: z.string().min(1),
});

router.post(
  '/create',
  authenticate,
  requireRole('president', 'guard'),
  async (req, res) => {
    const body = CreateQrSchema.parse(req.body);
    const token = await createToken(
      body.type as QrTokenType,
      body.issuedTo,
      req.user!.societyId,
      body.ttlSeconds,
      body.referenceId,
      body.isSingleUse,
    );
    res.status(201).json({ token });
  },
);

router.post(
  '/verify',
  authenticate,
  requireRole('guard'),
  async (req, res) => {
    const body = VerifyQrSchema.parse(req.body);
    const record = await verifyToken(body.token);
    res.json({ valid: true, record });
  },
);

export default router;
