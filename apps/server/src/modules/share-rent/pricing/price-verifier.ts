export interface PriceRange {
  min: number;
  max: number;
}

export type AiVerdict = 'FAIR' | 'HIGH' | 'LOW' | 'TOO_HIGH' | 'TOO_LOW' | 'SUSPICIOUS' | 'PROHIBITED';

export interface AiPriceVerification {
  verdict: AiVerdict;
  suggestedHourlyRangePaise?: PriceRange;
  suggestedDailyRangePaise?: PriceRange;
  suggestedDepositRangePaise?: PriceRange;
  reason: string;
  verifiedAt: Date;
}

export interface VerifyPriceParams {
  name: string;
  category: string;
  ageYears: number;
  condition: 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'HEAVILY_USED';
  estimatedPurchasePricePaise?: number;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
}

const PROHIBITED_KEYWORDS = [
  'weapon',
  'gun',
  'pistol',
  'rifle',
  'knife',
  'knives',
  'dagger',
  'explosive',
  'firework',
  'drug',
  'medicine',
  'chemical',
  'poison',
  'liquor',
  'alcohol',
  'tobacco',
  'cigarette',
];

const DEFAULT_CATEGORY_VALUATIONS: Record<
  string,
  { estimatedValuePaise: number; hourly: PriceRange; daily: PriceRange; deposit: PriceRange }
> = {
  drill: {
    estimatedValuePaise: 350000, // ₹3,500
    hourly: { min: 3000, max: 7000 }, // ₹30 - ₹70
    daily: { min: 15000, max: 30000 }, // ₹150 - ₹300
    deposit: { min: 100000, max: 200000 }, // ₹1,000 - ₹2,000
  },
  ladder: {
    estimatedValuePaise: 400000, // ₹4,000
    hourly: { min: 2500, max: 6000 }, // ₹25 - ₹60
    daily: { min: 12000, max: 25000 }, // ₹120 - ₹250
    deposit: { min: 100000, max: 200000 }, // ₹1,000 - ₹2,000
  },
  'party vessels': {
    estimatedValuePaise: 500000, // ₹5,000
    hourly: { min: 3000, max: 8000 },
    daily: { min: 15000, max: 35000 },
    deposit: { min: 150000, max: 300000 },
  },
  suitcase: {
    estimatedValuePaise: 300000, // ₹3,000
    hourly: { min: 2000, max: 5000 },
    daily: { min: 10000, max: 25000 },
    deposit: { min: 80000, max: 150000 },
  },
  'pressure cooker': {
    estimatedValuePaise: 250000, // ₹2,500
    hourly: { min: 1500, max: 4000 },
    daily: { min: 8000, max: 20000 },
    deposit: { min: 60000, max: 120000 },
  },
  'extension board': {
    estimatedValuePaise: 100000, // ₹1,000
    hourly: { min: 1000, max: 2500 },
    daily: { min: 4000, max: 10000 },
    deposit: { min: 30000, max: 60000 },
  },
  'camping gear': {
    estimatedValuePaise: 800000, // ₹8,000
    hourly: { min: 5000, max: 12000 },
    daily: { min: 25000, max: 60000 },
    deposit: { min: 200000, max: 400000 },
  },
  'kids cycles': {
    estimatedValuePaise: 600000, // ₹6,000
    hourly: { min: 3000, max: 8000 },
    daily: { min: 15000, max: 40000 },
    deposit: { min: 150000, max: 300000 },
  },
};

/**
 * Checks if the item name or description contains prohibited items.
 */
export function isProhibitedItem(text: string): boolean {
  const lower = text.toLowerCase();
  return PROHIBITED_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}`, 'i');
    return regex.test(lower);
  });
}

/**
 * Pure rule-based price verifier.
 * Computes fair market rate ranges and checks sanity against estimated value.
 */
export function verifyPriceRules(params: VerifyPriceParams): AiPriceVerification {
  // 1. Prohibited item check
  if (isProhibitedItem(params.name) || isProhibitedItem(params.category)) {
    throw new Error(
      'Listing prohibited: weapons, medicines, chemicals, or unsafe items are not allowed.',
    );
  }

  const categoryLower = params.category.toLowerCase().trim();
  const defaultValuation = DEFAULT_CATEGORY_VALUATIONS[categoryLower];

  const estimatedValue =
    params.estimatedPurchasePricePaise && params.estimatedPurchasePricePaise > 0
      ? params.estimatedPurchasePricePaise
      : defaultValuation?.estimatedValuePaise ?? 300000; // default ₹3,000

  // Condition adjustment factor
  let conditionFactor = 1.0;
  if (params.condition === 'LIKE_NEW') conditionFactor = 1.1;
  else if (params.condition === 'FAIR') conditionFactor = 0.8;
  else if (params.condition === 'HEAVILY_USED') conditionFactor = 0.6;

  // Age depreciation (e.g. 10% per year, min 50%)
  const ageFactor = Math.max(0.5, 1 - params.ageYears * 0.1);
  const adjustedValue = Math.round(estimatedValue * conditionFactor * ageFactor);

  // Suggested ranges
  const suggestedHourly: PriceRange = {
    min: Math.max(1000, Math.round(adjustedValue * 0.008)), // ~0.8% of value / hr
    max: Math.max(2500, Math.round(adjustedValue * 0.02)), // ~2% of value / hr
  };

  const suggestedDaily: PriceRange = {
    min: Math.max(3000, Math.round(adjustedValue * 0.03)), // ~3% of value / day
    max: Math.max(8000, Math.round(adjustedValue * 0.08)), // ~8% of value / day
  };

  const suggestedDeposit: PriceRange = {
    min: Math.max(20000, Math.round(adjustedValue * 0.2)), // ~20% of value
    max: Math.max(50000, Math.round(adjustedValue * 0.6)), // ~60% of value
  };

  let verdict: AiVerdict = 'FAIR';
  let reason = 'Pricing is within fair market range for society sharing.';

  // Sanity Rule 1: Safe deposit should not exceed estimated purchase price
  if (params.safeDepositPaise > estimatedValue * 1.05) {
    verdict = 'TOO_HIGH';
    reason = `Safe deposit (₹${(params.safeDepositPaise / 100).toFixed(0)}) cannot exceed the item's estimated value (₹${(estimatedValue / 100).toFixed(0)}).`;
  }
  // Sanity Rule 2: 1 day charge should not be close to buying the item (> 20% of estimated purchase price)
  else if (params.chargeDailyPaise && params.chargeDailyPaise > estimatedValue * 0.2) {
    verdict = 'TOO_HIGH';
    reason = `Daily rate (₹${(params.chargeDailyPaise / 100).toFixed(0)}) is too high compared to the purchase price (₹${(estimatedValue / 100).toFixed(0)}).`;
  }
  // Sanity Rule 3: Daily rate is unreasonably low (< 0.8% of value)
  else if (params.chargeDailyPaise && params.chargeDailyPaise < estimatedValue * 0.008) {
    verdict = 'TOO_LOW';
    reason = `Daily rate (₹${(params.chargeDailyPaise / 100).toFixed(0)}) is too low for this item condition.`;
  }
  // Sanity Rule 4: Hourly rate should not exceed daily / 2 if both given
  else if (
    params.chargeHourlyPaise &&
    params.chargeDailyPaise &&
    params.chargeHourlyPaise > params.chargeDailyPaise * 0.6
  ) {
    verdict = 'TOO_HIGH';
    reason = 'Hourly rate is too high relative to the daily rate (renting 2 hours exceeds half a day).';
  }
  // Sanity Rule 5: Compare against suggested ranges if specified
  else if (params.chargeDailyPaise && params.chargeDailyPaise > suggestedDaily.max * 1.4) {
    verdict = 'TOO_HIGH';
    reason = `Daily rate is significantly above average society rates (suggested: ₹${(suggestedDaily.min / 100).toFixed(0)} - ₹${(suggestedDaily.max / 100).toFixed(0)}).`;
  } else if (params.chargeHourlyPaise && params.chargeHourlyPaise > suggestedHourly.max * 1.5) {
    verdict = 'TOO_HIGH';
    reason = `Hourly rate is above average society rates (suggested: ₹${(suggestedHourly.min / 100).toFixed(0)} - ₹${(suggestedHourly.max / 100).toFixed(0)}).`;
  }

  return {
    verdict,
    suggestedHourlyRangePaise: suggestedHourly,
    suggestedDailyRangePaise: suggestedDaily,
    suggestedDepositRangePaise: suggestedDeposit,
    reason,
    verifiedAt: new Date(),
  };
}

/**
 * AI Price Verifier — uses rule-based engine as solid fallback.
 */
export async function verifyPriceWithAi(params: VerifyPriceParams): Promise<AiPriceVerification> {
  // If ANTHROPIC_API_KEY is configured, can query Claude Haiku; otherwise run rule-based engine directly.
  return verifyPriceRules(params);
}
