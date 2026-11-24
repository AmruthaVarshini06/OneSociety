import { z } from 'zod';

// ── Resident expresses or updates demand ─────────────────────────────────
export const upsertDemandSchema = z.object({
  quantityWanted: z.number().int().min(1).max(1000),
});

export type UpsertDemandInput = z.infer<typeof upsertDemandSchema>;
