
export interface PriceTier {
  minQuantity: number;
  pricePerUnit: number;
}

export interface PricingResult {
  pricePerUnit: number;
  tierIndex: number;
  totalPrice: number;
  nextTier?: {
    minQuantity: number;
    pricePerUnit: number;
    unitsNeeded: number;
  };
}

export function calculateTieredPrice(
  tiers: PriceTier[],
  totalQuantity: number,
  unitQuantity = 1,
): PricingResult | null {
  if (!tiers || tiers.length === 0) return null;
  if (totalQuantity <= 0) return null;

  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  let appliedTierIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (totalQuantity >= sorted[i].minQuantity) {
      appliedTierIndex = i;
    }
  }

  if (appliedTierIndex === -1) return null;

  const tier = sorted[appliedTierIndex];

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

export function previewPriceWithExtra(
  tiers: PriceTier[],
  currentTotal: number,
  extraUnits: number,
): PricingResult | null {
  return calculateTieredPrice(tiers, currentTotal + extraUnits, extraUnits);
}

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
