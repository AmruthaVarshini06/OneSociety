/**
 * Tiered bulk pricing — pure function, no side effects.
 *
 * A tier is { minQuantity, pricePerUnit }.
 * Tiers must be sorted ascending by minQuantity.
 * The applicable tier is the highest tier whose minQuantity <= totalQuantity.
 * If totalQuantity < the first tier's minQuantity, no tier applies (null).
 */

export interface PriceTier {
  minQuantity: number;   // minimum total units for this tier to apply
  pricePerUnit: number;  // in paise (integers only)
}

export interface PricingResult {
  pricePerUnit: number;    // in paise
  tierIndex: number;       // 0-based index of the tier that applied
  totalPrice: number;      // pricePerUnit * quantity
  nextTier?: {
    minQuantity: number;
    pricePerUnit: number;
    unitsNeeded: number;   // how many more units until the next tier
  };
}

/**
 * Calculate the per-unit price for a given total quantity against tiered pricing.
 *
 * @param tiers       Array of price tiers sorted ascending by minQuantity
 * @param totalQuantity  Current total demand quantity
 * @param unitQuantity   Quantity to price (usually 1 unit for display, or the resident's quantity)
 * @returns PricingResult or null if no tier applies (minimum not reached)
 */
export function calculateTieredPrice(
  tiers: PriceTier[],
  totalQuantity: number,
  unitQuantity = 1,
): PricingResult | null {
  if (!tiers || tiers.length === 0) return null;
  if (totalQuantity <= 0) return null;

  // Sort ascending (defensive – callers should pre-sort, but be safe)
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  // Find highest applicable tier
  let appliedTierIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (totalQuantity >= sorted[i].minQuantity) {
      appliedTierIndex = i;
    }
  }

  if (appliedTierIndex === -1) return null; // below minimum

  const tier = sorted[appliedTierIndex];

  // Look up the next tier (if any) so UI can show "X more units → save ₹Y"
  const nextTierRaw = sorted[appliedTierIndex + 1];
  const nextTier = nextTierRaw
    ? {
        minQuantity: nextTierRaw.minQuantity,
        pricePerUnit: nextTierRaw.pricePerUnit,
        unitsNeeded: nextTierRaw.minQuantity - totalQuantity,
      }
    : undefined;

  return {
    pricePerUnit: tier.pricePerUnit,
    tierIndex: appliedTierIndex,
    totalPrice: tier.pricePerUnit * unitQuantity,
    nextTier,
  };
}

/**
 * Returns what price would apply if one more unit is added.
 * Useful to show the resident what they unlock by joining.
 */
export function previewPriceWithExtra(
  tiers: PriceTier[],
  currentTotal: number,
  extraUnits: number,
): PricingResult | null {
  return calculateTieredPrice(tiers, currentTotal + extraUnits, extraUnits);
}

/**
 * Validate a tiers array: must be non-empty, minQuantity > 0, pricePerUnit > 0,
 * all integers, minQuantities unique and ascending.
 */
export function validateTiers(tiers: PriceTier[]): { valid: boolean; reason?: string } {
  if (!tiers || tiers.length === 0) {
    return { valid: false, reason: 'At least one price tier is required' };
  }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!Number.isInteger(t.minQuantity) || t.minQuantity <= 0) {
      return { valid: false, reason: `Tier ${i + 1}: minQuantity must be a positive integer` };
    }
    if (!Number.isInteger(t.pricePerUnit) || t.pricePerUnit <= 0) {
      return { valid: false, reason: `Tier ${i + 1}: pricePerUnit must be a positive integer (paise)` };
    }
    if (i > 0 && tiers[i].minQuantity <= tiers[i - 1].minQuantity) {
      return { valid: false, reason: `Tiers must have strictly ascending minQuantity values` };
    }
    if (i > 0 && tiers[i].pricePerUnit >= tiers[i - 1].pricePerUnit) {
      return { valid: false, reason: `Higher tiers must have lower pricePerUnit (bulk discount)` };
    }
  }
  return { valid: true };
}
