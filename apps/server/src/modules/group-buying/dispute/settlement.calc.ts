/**
 * Pure calculation functions for Group Buying settlement and ratings.
 */

export interface CommitmentSettlementInput {
  commitmentId: string;
  totalAmountPaise: number;
}

export interface IssueRefundInput {
  commitmentId: string;
  refundAmountPaise: number;
  status: string; // 'RESOLVED_REFUND', etc.
}

export interface SettlementCalculationResult {
  totalPaidPaise: number;
  totalRefundedPaise: number;
  netSupplierPayoutPaise: number;
  commitmentPayouts: Array<{
    commitmentId: string;
    paidPaise: number;
    refundedPaise: number;
    payoutPaise: number;
  }>;
}

/**
 * Calculates net supplier payout and resident refunds for an order.
 * All amounts are non-negative integers in paise.
 */
export function calculateOrderSettlement(
  commitments: CommitmentSettlementInput[],
  issues: IssueRefundInput[],
): SettlementCalculationResult {
  let totalPaidPaise = 0;
  let totalRefundedPaise = 0;
  let netSupplierPayoutPaise = 0;

  const commitmentPayouts = commitments.map((c) => {
    totalPaidPaise += c.totalAmountPaise;

    const flatRefunds = issues.filter(
      (i) => i.commitmentId === c.commitmentId && i.status === 'RESOLVED_REFUND',
    );
    const refundedPaise = flatRefunds.reduce((sum, i) => sum + i.refundAmountPaise, 0);
    totalRefundedPaise += refundedPaise;

    const payoutPaise = Math.max(0, c.totalAmountPaise - refundedPaise);
    netSupplierPayoutPaise += payoutPaise;

    return {
      commitmentId: c.commitmentId,
      paidPaise: c.totalAmountPaise,
      refundedPaise,
      payoutPaise,
    };
  });

  return {
    totalPaidPaise,
    totalRefundedPaise,
    netSupplierPayoutPaise,
    commitmentPayouts,
  };
}

/**
 * Computes updated average rating and total review count.
 * Returns rating rounded to 1 decimal place.
 */
export function computeAverageRating(ratings: number[]): { average: number; count: number } {
  if (!ratings || ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const avg = sum / ratings.length;
  return {
    average: Math.round(avg * 10) / 10,
    count: ratings.length,
  };
}
