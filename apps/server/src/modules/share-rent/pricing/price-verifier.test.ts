import { verifyPriceRules, isProhibitedItem } from './price-verifier';

describe('AI Price Verifier & Prohibited Items Engine', () => {
  describe('isProhibitedItem', () => {
    it('detects weapons, drugs, and medicines', () => {
      expect(isProhibitedItem('Hunting rifle')).toBe(true);
      expect(isProhibitedItem('Kitchen knife set')).toBe(true);
      expect(isProhibitedItem('Cough medicine')).toBe(true);
      expect(isProhibitedItem('Party fireworks')).toBe(true);
    });

    it('allows normal shareable household items', () => {
      expect(isProhibitedItem('Bosch Hammer Drill')).toBe(false);
      expect(isProhibitedItem('Aluminium Step Ladder')).toBe(false);
      expect(isProhibitedItem('Large Biryani Vessels')).toBe(false);
      expect(isProhibitedItem('Extension Cord')).toBe(false);
    });
  });

  describe('verifyPriceRules', () => {
    it('returns FAIR verdict for a moderately priced drill', () => {
      const result = verifyPriceRules({
        name: 'Bosch Power Drill',
        category: 'drill',
        ageYears: 1,
        condition: 'GOOD',
        estimatedPurchasePricePaise: 400000,
        chargeHourlyPaise: 4000,
        chargeDailyPaise: 20000,
        safeDepositPaise: 150000,
      });

      expect(result.verdict).toBe('FAIR');
      expect(result.suggestedHourlyRangePaise).toBeDefined();
      expect(result.suggestedDailyRangePaise).toBeDefined();
      expect(result.suggestedDepositRangePaise).toBeDefined();
    });

    it('flags TOO_HIGH when deposit exceeds estimated purchase price', () => {
      const result = verifyPriceRules({
        name: 'Step Ladder',
        category: 'ladder',
        ageYears: 2,
        condition: 'FAIR',
        estimatedPurchasePricePaise: 300000,
        chargeDailyPaise: 15000,
        safeDepositPaise: 500000,
      });

      expect(result.verdict).toBe('TOO_HIGH');
      expect(result.reason).toContain('Safe deposit');
    });

    it('flags TOO_HIGH when daily charge is close to buying the item (> 20% of value)', () => {
      const result = verifyPriceRules({
        name: 'Extension Board',
        category: 'extension board',
        ageYears: 0,
        condition: 'LIKE_NEW',
        estimatedPurchasePricePaise: 100000,
        chargeDailyPaise: 35000,
        safeDepositPaise: 40000,
      });

      expect(result.verdict).toBe('TOO_HIGH');
      expect(result.reason).toContain('Daily rate');
    });

    it('flags TOO_LOW when daily rate is trivial', () => {
      const result = verifyPriceRules({
        name: 'Camping Tent',
        category: 'camping gear',
        ageYears: 1,
        condition: 'GOOD',
        estimatedPurchasePricePaise: 1000000,
        chargeDailyPaise: 2000,
        safeDepositPaise: 200000,
      });

      expect(result.verdict).toBe('TOO_LOW');
      expect(result.reason).toContain('too low');
    });

    it('throws error when listing a prohibited item', () => {
      expect(() => {
        verifyPriceRules({
          name: 'Combat Knife',
          category: 'knives',
          ageYears: 0,
          condition: 'LIKE_NEW',
          safeDepositPaise: 50000,
          chargeDailyPaise: 10000,
        });
      }).toThrow('Listing prohibited');
    });
  });
});
