import { calculateTieredPrice, previewPriceWithExtra, validateTiers, type PriceTier } from './pricing';

const TIERS: PriceTier[] = [
  { minQuantity: 10,  pricePerUnit: 50000 }, // ₹500
  { minQuantity: 25,  pricePerUnit: 44000 }, // ₹440
  { minQuantity: 50,  pricePerUnit: 38000 }, // ₹380
];

describe('Tiered Pricing', () => {
  // ── calculateTieredPrice ────────────────────────────────────────────────
  describe('calculateTieredPrice', () => {
    it('returns null when below minimum tier', () => {
      expect(calculateTieredPrice(TIERS, 5)).toBeNull();
    });

    it('returns null for zero quantity', () => {
      expect(calculateTieredPrice(TIERS, 0)).toBeNull();
    });

    it('returns null for empty tiers', () => {
      expect(calculateTieredPrice([], 100)).toBeNull();
    });

    it('applies tier 1 at exactly minimum quantity', () => {
      const result = calculateTieredPrice(TIERS, 10, 1);
      expect(result).not.toBeNull();
      expect(result!.pricePerUnit).toBe(50000);
      expect(result!.tierIndex).toBe(0);
      expect(result!.totalPrice).toBe(50000);
    });

    it('applies tier 1 for quantity between tier 1 and tier 2', () => {
      const result = calculateTieredPrice(TIERS, 20, 1);
      expect(result!.pricePerUnit).toBe(50000);
      expect(result!.tierIndex).toBe(0);
    });

    it('applies tier 2 at exactly its minimum quantity', () => {
      const result = calculateTieredPrice(TIERS, 25, 1);
      expect(result!.pricePerUnit).toBe(44000);
      expect(result!.tierIndex).toBe(1);
    });

    it('applies tier 3 for quantity at or above 50', () => {
      const result = calculateTieredPrice(TIERS, 60, 1);
      expect(result!.pricePerUnit).toBe(38000);
      expect(result!.tierIndex).toBe(2);
    });

    it('multiplies totalPrice by unitQuantity', () => {
      const result = calculateTieredPrice(TIERS, 50, 3);
      expect(result!.pricePerUnit).toBe(38000);
      expect(result!.totalPrice).toBe(38000 * 3);
    });

    it('shows nextTier when a higher tier exists', () => {
      const result = calculateTieredPrice(TIERS, 15, 1);
      expect(result!.nextTier).toBeDefined();
      expect(result!.nextTier!.minQuantity).toBe(25);
      expect(result!.nextTier!.unitsNeeded).toBe(10); // 25 - 15
    });

    it('shows no nextTier when already at highest tier', () => {
      const result = calculateTieredPrice(TIERS, 100, 1);
      expect(result!.nextTier).toBeUndefined();
    });

    it('handles unsorted tiers (sorts internally)', () => {
      const unsorted: PriceTier[] = [
        { minQuantity: 50, pricePerUnit: 38000 },
        { minQuantity: 10, pricePerUnit: 50000 },
        { minQuantity: 25, pricePerUnit: 44000 },
      ];
      const result = calculateTieredPrice(unsorted, 25, 1);
      expect(result!.pricePerUnit).toBe(44000);
    });

    it('handles single tier', () => {
      const single: PriceTier[] = [{ minQuantity: 1, pricePerUnit: 10000 }];
      const result = calculateTieredPrice(single, 1, 2);
      expect(result!.pricePerUnit).toBe(10000);
      expect(result!.totalPrice).toBe(20000);
      expect(result!.nextTier).toBeUndefined();
    });
  });

  // ── previewPriceWithExtra ───────────────────────────────────────────────
  describe('previewPriceWithExtra', () => {
    it('shows price that would apply if more units joined', () => {
      // 15 existing + 10 extra = 25 → tier 2
      const result = previewPriceWithExtra(TIERS, 15, 10);
      expect(result!.pricePerUnit).toBe(44000);
    });

    it('returns null when extra would still be below minimum', () => {
      const result = previewPriceWithExtra(TIERS, 0, 5);
      expect(result).toBeNull();
    });
  });

  // ── validateTiers ───────────────────────────────────────────────────────
  describe('validateTiers', () => {
    it('accepts valid tiers', () => {
      expect(validateTiers(TIERS).valid).toBe(true);
    });

    it('rejects empty tiers array', () => {
      const r = validateTiers([]);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/at least one/i);
    });

    it('rejects non-integer minQuantity', () => {
      const r = validateTiers([{ minQuantity: 1.5, pricePerUnit: 10000 }]);
      expect(r.valid).toBe(false);
    });

    it('rejects zero pricePerUnit', () => {
      const r = validateTiers([{ minQuantity: 10, pricePerUnit: 0 }]);
      expect(r.valid).toBe(false);
    });

    it('rejects tiers not in ascending minQuantity order', () => {
      const r = validateTiers([
        { minQuantity: 25, pricePerUnit: 44000 },
        { minQuantity: 10, pricePerUnit: 50000 },
      ]);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/ascending/i);
    });

    it('rejects tiers where higher tier has higher price (not a discount)', () => {
      const r = validateTiers([
        { minQuantity: 10, pricePerUnit: 44000 },
        { minQuantity: 25, pricePerUnit: 50000 }, // price went UP
      ]);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/lower pricePerUnit/i);
    });
  });
});
