export type ScopeLevel = 'FLAT_ROUTE' | 'FLOOR' | 'BLOCK' | 'SOCIETY';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityWeights {
  severityWeight: number; // default 0.40
  countWeight: number;    // default 0.25
  scopeWeight: number;    // default 0.15
  waitingWeight: number;  // default 0.10
  reopenWeight: number;   // default 0.10
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  severityWeight: 0.40,
  countWeight: 0.25,
  scopeWeight: 0.15,
  waitingWeight: 0.10,
  reopenWeight: 0.10,
};

export const SCOPE_VALUES: Record<ScopeLevel, number> = {
  FLAT_ROUTE: 0.2,
  FLOOR: 0.4,
  BLOCK: 0.7,
  SOCIETY: 1.0,
};

export const TARGET_RESPONSE_HOURS: Record<PriorityLevel, number> = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

export interface PriorityCalculationInput {
  severity: number;         // 1 - 5
  isSafetyOverride?: boolean;
  reportCount: number;      // n >= 1
  scopeLevel: ScopeLevel;
  daysWaiting: number;      // days since first report (can be fractional)
  reopenCount: number;      // >= 0
  weights?: Partial<PriorityWeights>;
  issueTitle?: string;
  category?: string;
}

export interface PriorityCalculationResult {
  score: number;            // 0 - 100
  level: PriorityLevel;
  reason: string;
  isSafetyOverride: boolean;
  targetResponseHours: number;
  breakdown: {
    severityScore: number;
    countScore: number;
    scopeScore: number;
    waitingScore: number;
    reopenScore: number;
  };
}

/**
 * Calculates priority score (0-100) and level based on Section 5 formula.
 */
export function calculatePriority(input: PriorityCalculationInput): PriorityCalculationResult {
  const weights: PriorityWeights = {
    ...DEFAULT_WEIGHTS,
    ...(input.weights || {}),
  };

  const n = Math.max(1, input.reportCount);
  const severity = Math.max(1, Math.min(5, input.severity));
  const isSafetyOverride = input.isSafetyOverride === true || severity === 5;

  // 1. Severity component (0 - 1)
  const severityScore = severity / 5;

  // 2. Count component using natural logarithm curve (0 - 1)
  // count_score = min(1, ln(1 + n) / ln(1 + 10))
  const countScore = Math.min(1, Math.log(1 + n) / Math.log(1 + 10));

  // 3. Scope component (0.2, 0.4, 0.7, 1.0)
  const scopeScore = SCOPE_VALUES[input.scopeLevel] ?? 0.7;

  // 4. Waiting time component: normalized up to 14 days
  const waitingDays = Math.max(0, input.daysWaiting);
  const waitingScore = Math.min(1, waitingDays / 14);

  // 5. Reopen factor: each reopen adds significant weight
  const reopenCount = Math.max(0, input.reopenCount);
  const reopenScore = Math.min(1, reopenCount * 0.5);

  // Weighted raw score calculation (0 - 1)
  const weightedSum =
    weights.severityWeight * severityScore +
    weights.countWeight * countScore +
    weights.scopeWeight * scopeScore +
    weights.waitingWeight * waitingScore +
    weights.reopenWeight * reopenScore;

  let score = Math.round(weightedSum * 100);
  score = Math.max(0, Math.min(100, score));

  // Safety override rule: Any severity-5 is automatically CRITICAL (100)
  if (isSafetyOverride) {
    score = 100;
  }

  // Determine Priority Level
  let level: PriorityLevel;
  if (score >= 80 || isSafetyOverride) {
    level = 'CRITICAL';
  } else if (score >= 60) {
    level = 'HIGH';
  } else if (score >= 35) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  // Construct one-line human-readable reason
  let reason: string;
  const daysText = waitingDays >= 1 ? `${Math.round(waitingDays)} days` : `${Math.max(1, Math.round(waitingDays * 24))} hours`;

  if (isSafetyOverride) {
    reason = `${input.issueTitle || input.category || 'Issue'}: Danger to life/safety (Immediate Safety Override).`;
  } else if (reopenCount > 0) {
    reason = `${input.issueTitle || input.category || 'Issue'}, reopened ${reopenCount} time${reopenCount > 1 ? 's' : ''}, reported by ${n} resident${n > 1 ? 's' : ''}.`;
  } else if (n > 1) {
    reason = `${input.issueTitle || input.category || 'Issue'}, reported by ${n} residents, waiting ${daysText}.`;
  } else {
    reason = `${input.issueTitle || input.category || 'Issue'} reported, waiting ${daysText}.`;
  }

  return {
    score,
    level,
    reason,
    isSafetyOverride,
    targetResponseHours: TARGET_RESPONSE_HOURS[level],
    breakdown: {
      severityScore,
      countScore,
      scopeScore,
      waitingScore,
      reopenScore,
    },
  };
}
