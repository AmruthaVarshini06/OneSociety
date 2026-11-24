import {
  calculatePriority,
  DEFAULT_WEIGHTS,
} from '../src/modules/complaints/ai/priority-scoring';

describe('Smart Complaint AI Priority Scoring Engine', () => {
  test('Case 1: Single report of minor issue (severity 1, 1 report, 0 days, 0 reopens)', () => {
    const result = calculatePriority({
      severity: 1,
      reportCount: 1,
      scopeLevel: 'FLAT_ROUTE',
      daysWaiting: 0,
      reopenCount: 0,
      issueTitle: 'Corridor wall scuff',
    });

    expect(result.score).toBeLessThan(35);
    expect(result.level).toBe('LOW');
    expect(result.isSafetyOverride).toBe(false);
    expect(result.targetResponseHours).toBe(168); // 7 days
    expect(result.reason).toContain('reported');
  });

  test('Case 2: 6 reports on a lift (severity 4, 6 reports, 2 days waiting, block scope)', () => {
    const result = calculatePriority({
      severity: 4,
      reportCount: 6,
      scopeLevel: 'BLOCK',
      daysWaiting: 2,
      reopenCount: 0,
      issueTitle: 'Lift 2 in Block B not working',
    });

    // Severity 4/5 = 0.8 * 0.40 = 0.32
    // 6 reports count_score = ln(7)/ln(11) = 1.9459 / 2.3979 = 0.8115 * 0.25 = 0.2028
    // Scope BLOCK = 0.7 * 0.15 = 0.105
    // Waiting 2/14 = 0.1428 * 0.10 = 0.0142
    // Total = 0.32 + 0.2028 + 0.105 + 0.0142 = 0.642 -> 64
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThanOrEqual(75);
    expect(result.level).toBe('HIGH');
    expect(result.targetResponseHours).toBe(24); // 24 hours for HIGH
    expect(result.reason).toContain('reported by 6 residents');
  });

  test('Case 3: Safety Override (severity 5: exposed wiring, even with 1 report)', () => {
    const result = calculatePriority({
      severity: 5,
      isSafetyOverride: true,
      reportCount: 1,
      scopeLevel: 'FLOOR',
      daysWaiting: 0,
      reopenCount: 0,
      issueTitle: 'Exposed wiring on Block C staircase',
    });

    expect(result.score).toBe(100);
    expect(result.level).toBe('CRITICAL');
    expect(result.isSafetyOverride).toBe(true);
    expect(result.targetResponseHours).toBe(4); // 4 hours for CRITICAL
    expect(result.reason).toContain('Safety Override');
  });

  test('Case 4: Waiting-time growth (older issues slowly rise)', () => {
    const initial = calculatePriority({
      severity: 3,
      reportCount: 1,
      scopeLevel: 'BLOCK',
      daysWaiting: 0,
      reopenCount: 0,
    });

    const twoWeeksLater = calculatePriority({
      severity: 3,
      reportCount: 1,
      scopeLevel: 'BLOCK',
      daysWaiting: 14,
      reopenCount: 0,
    });

    // 14 days waiting adds 10 points (0.10 * 1.0 * 100)
    expect(twoWeeksLater.score).toBeGreaterThan(initial.score);
    expect(twoWeeksLater.score - initial.score).toBe(10);
  });

  test('Case 5: Reopen increase (reopening an issue increases priority)', () => {
    const beforeReopen = calculatePriority({
      severity: 3,
      reportCount: 2,
      scopeLevel: 'BLOCK',
      daysWaiting: 1,
      reopenCount: 0,
    });

    const afterReopen = calculatePriority({
      severity: 3,
      reportCount: 2,
      scopeLevel: 'BLOCK',
      daysWaiting: 1,
      reopenCount: 1,
    });

    // Reopen factor 1 * 0.5 = 0.5 * 0.10 = 0.05 * 100 = +5 points
    expect(afterReopen.score).toBeGreaterThan(beforeReopen.score);
    expect(afterReopen.reason).toContain('reopened 1 time');
  });

  test('Case 6: Custom configurable weights', () => {
    const customWeights = {
      ...DEFAULT_WEIGHTS,
      severityWeight: 0.60,
      countWeight: 0.10,
    };

    const res = calculatePriority({
      severity: 4,
      reportCount: 10,
      scopeLevel: 'SOCIETY',
      daysWaiting: 3,
      reopenCount: 0,
      weights: customWeights,
    });

    expect(res.score).toBeGreaterThan(60);
  });
});
