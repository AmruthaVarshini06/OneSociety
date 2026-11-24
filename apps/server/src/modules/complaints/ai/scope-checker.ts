export interface ScopeCheckResult {
  scopeStatus: 'SOCIETY_VALID' | 'INTERNAL_FLAT_BLOCKED' | 'UNCLEAR_PRESIDENT_REVIEW';
  message?: string;
  suggestServiceHub: boolean;
  serviceHubCategorySlug?: string;
}

// Flat-internal keywords & patterns
const FLAT_INTERNAL_PATTERNS = [
  /\b(my|inside|in)\s+(kitchen|bedroom|bathroom|balcony|drawing room|living room|hall)\b/i,
  /\b(my|inside my|our)\s+(flat|apartment|unit|house|home|room)\b/i,
  /\b(my)\s+(tap|geyser|fan|ac|air conditioner|refrigerator|fridge|tv|microwave|oven|washing machine|switchboard|fuse|sink|commode|flush)\b/i,
  /\b(bedroom|kitchen|bathroom|drawing room)\s+(tap|light|fan|plug|switch|wall|tile|door)\b/i,
  /\b(wardrobe|sofa|bed|mattress|dining table|chair)\b/i,
];

// Boundary / Unclear patterns (e.g. common pipeline leakage affecting flat, seepage from terrace)
const UNCLEAR_BOUNDARY_PATTERNS = [
  /\b(seepage|leakage|water)\s+(from|through)\s+(terrace|roof|ceiling|pillar|common duct|shaft|main pipe)\b/i,
  /\b(from above flat|from upper floor|from top floor|from neighbor's floor)\b/i,
  /\b(common|external|shaft|duct)\s+(pipe|drain|pipeline)\b/i,
  /\b(boundary|shared wall|structural crack)\b/i,
];

/**
 * Checks whether an issue is valid for society common areas,
 * blocked as internal flat issue, or flagged for president review.
 */
export function checkComplaintScope(description: string, specificArea: string, category: string): ScopeCheckResult {
  const combinedText = `${specificArea} ${description}`.toLowerCase();

  // 1. Check for boundary/unclear cases first
  for (const pattern of UNCLEAR_BOUNDARY_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        scopeStatus: 'UNCLEAR_PRESIDENT_REVIEW',
        message: 'Scope to be confirmed by the president (potential shared/external duct or structural issue).',
        suggestServiceHub: false,
      };
    }
  }

  // 2. Check for flat-internal patterns
  for (const pattern of FLAT_INTERNAL_PATTERNS) {
    if (pattern.test(combinedText)) {
      // Determine suggested ServiceHub trade
      let serviceHubCategorySlug = 'home_repair';
      if (/ac|fridge|microwave|washing machine/i.test(combinedText)) {
        serviceHubCategorySlug = 'home_repair';
      } else if (/tap|sink|flush|commode|pipe|drain/i.test(combinedText)) {
        serviceHubCategorySlug = 'home_repair';
      } else if (/fan|switch|light|plug|wiring/i.test(combinedText)) {
        serviceHubCategorySlug = 'home_repair';
      }

      return {
        scopeStatus: 'INTERNAL_FLAT_BLOCKED',
        message: 'This looks like a problem inside your flat. You can hire a verified provider through ServiceHub.',
        suggestServiceHub: true,
        serviceHubCategorySlug,
      };
    }
  }

  // 3. Defaults to society common area valid
  return {
    scopeStatus: 'SOCIETY_VALID',
    suggestServiceHub: false,
  };
}
