export interface SeverityResult {
  severity: number;
  isSafetyOverride: boolean;
  reason: string;
}

const SEVERITY_5_PATTERNS = [
  /\b(exposed wiring|open wire|naked wire|short circuit|sparking|sparks flying|electrocution risk)\b/i,
  /\b(fire|smoke in lift|gas leak|cylinder leak|smell of gas)\b/i,
  /\b(person stuck|child stuck|stuck in lift|passenger trapped|stuck inside)\b/i,
  /\b(collapse|falling debris|ceiling collapse|parapet broken|balcony rail broken)\b/i,
];

const SEVERITY_4_PATTERNS = [
  /\b(lift (down|stopped|broken|not working|stuck|halted))\b/i,
  /\b(no water|water supply stopped|tank empty|motor burnt|pump failed|pump not running)\b/i,
  /\b(power outage in entire|total blackout|generator fail|main breaker trip)\b/i,
  /\b(sewage overflowing|manhole overflow|drainage backup)\b/i,
];

const SEVERITY_3_PATTERNS = [
  /\b(leakage|water leak|pipe leak|roof leak|dampness|seepage)\b/i,
  /\b(drain block|drainage choked|standing water|puddle in corridor)\b/i,
  /\b(gate broken|main gate stuck|cctv offline|intercom down|security guard booth)\b/i,
  /\b(low water pressure|intermittent water)\b/i,
];

const SEVERITY_2_PATTERNS = [
  /\b(street light|corridor light|bulb fused|tube light broken)\b/i,
  /\b(garbage not collected|bin overflowing|trash accumulating|smelly waste)\b/i,
  /\b(parking issue|car parked in fire lane|unauthorized parking)\b/i,
  /\b(gym treadmill|gym equipment|clubhouse ac|pool filter)\b/i,
];

export function analyzeSeverity(category: string, description: string, specificArea: string): SeverityResult {
  const text = `${category} ${specificArea} ${description}`.toLowerCase();

  for (const pattern of SEVERITY_5_PATTERNS) {
    if (pattern.test(text)) {
      return {
        severity: 5,
        isSafetyOverride: true,
        reason: 'Immediate safety or life hazard identified (Safety Override)',
      };
    }
  }

  if (category === 'Fire safety') {
    return {
      severity: 5,
      isSafetyOverride: true,
      reason: 'Fire safety system hazard reported (Safety Override)',
    };
  }

  for (const pattern of SEVERITY_4_PATTERNS) {
    if (pattern.test(text)) {
      return {
        severity: 4,
        isSafetyOverride: false,
        reason: 'Essential society service or critical facility out of order',
      };
    }
  }
  if (category === 'Lift' && /not working|stopped|broken|down/i.test(text)) {
    return {
      severity: 4,
      isSafetyOverride: false,
      reason: 'Lift out of service',
    };
  }
  if (category === 'Water supply' && /motor|pump|empty|no water/i.test(text)) {
    return {
      severity: 4,
      isSafetyOverride: false,
      reason: 'Water supply failure in common area',
    };
  }

  for (const pattern of SEVERITY_3_PATTERNS) {
    if (pattern.test(text)) {
      return {
        severity: 3,
        isSafetyOverride: false,
        reason: 'Major common area inconvenience or leakage',
      };
    }
  }
  if (category === 'Structural issues in common areas' || category === 'Drainage and plumbing in common areas') {
    return {
      severity: 3,
      isSafetyOverride: false,
      reason: 'Plumbing or structural issue reported',
    };
  }

  for (const pattern of SEVERITY_2_PATTERNS) {
    if (pattern.test(text)) {
      return {
        severity: 2,
        isSafetyOverride: false,
        reason: 'Moderate issue or non-critical equipment malfunction',
      };
    }
  }

  return {
    severity: 1,
    isSafetyOverride: false,
    reason: 'Minor or cosmetic issue in common areas',
  };
}
