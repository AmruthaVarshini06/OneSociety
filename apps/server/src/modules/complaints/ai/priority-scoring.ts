export type ScopeLevel = 'FLAT_ROUTE' | 'FLOOR' | 'BLOCK' | 'SOCIETY';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityWeights {
  severityWeight: number;
  countWeight: number;
  scopeWeight: number;
  waitingWeight: number;
  reopenWeight: number;
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
  severity: number;
  isSafetyOverride?: boolean;
  reportCount: number;
  scopeLevel: ScopeLevel;
  daysWaiting: number;
  reopenCount: number;
  weights?: Partial<PriorityWeights>;
  issueTitle?: string;
  category?: string;
}

export interface PriorityCalculationResult {
  score: number;
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

export function calculatePriority(input: PriorityCalculationInput): PriorityCalculationResult {
  const weights: PriorityWeights = {
    ...DEFAULT_WEIGHTS,
    ...(input.weights || {}),
  };

  const n = Math.max(1, input.reportCount);
  const severity = Math.max(1, Math.min(5, input.severity));
  const isSafetyOverride = input.isSafetyOverride === true || severity === 5;

  const severityScore = severity / 5;

  const countScore = Math.min(1, Math.log(1 + n) / Math.log(1 + 10));

  const scopeScore = SCOPE_VALUES[input.scopeLevel] ?? 0.7;

  const waitingDays = Math.max(0, input.daysWaiting);
  const waitingScore = Math.min(1, waitingDays / 14);

  const reopenCount = Math.max(0, input.reopenCount);
  const reopenScore = Math.min(1, reopenCount * 0.5);

  const weightedSum =
    weights.severityWeight * severityScore +
    weights.countWeight * countScore +
    weights.scopeWeight * scopeScore +
    weights.waitingWeight * waitingScore +
    weights.reopenWeight * reopenScore;

  let score = Math.round(weightedSum * 100);
  score = Math.max(0, Math.min(100, score));

  if (isSafetyOverride) {
    score = 100;
  }

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
