import { z } from 'zod';
import { validateTiers } from '../pricing/pricing';

const priceTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  pricePerUnit: z.number().int().positive(),
});

export const submitOfferSchema = z
  .object({
    tiers: z.array(priceTierSchema).min(1, 'At least one tier required'),
    deliveryDays: z.number().int().min(1).max(60),
    note: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const result = validateTiers(data.tiers);
    if (!result.valid) {
      ctx.addIssue({ code: 'custom', path: ['tiers'], message: result.reason ?? 'Invalid tiers' });
    }
  });

export type SubmitOfferInput = z.infer<typeof submitOfferSchema>;

export const selectOfferSchema = z.object({
  note: z.string().max(300).optional(),
});

export type SelectOfferInput = z.infer<typeof selectOfferSchema>;
