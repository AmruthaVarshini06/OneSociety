
export interface CommitmentSettlementInput {
  commitmentId: string;
  totalAmountPaise: number;
}

export interface IssueRefundInput {
  commitmentId: string;
  refundAmountPaise: number;
  status: string;
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

export function computeAverageRating(ratings: number[]): { average: number; count: number } {
  if (!ratings || ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const avg = sum / ratings.length;
  return {
    average: Math.round(avg * 10) / 10,
    count: ratings.length,
  };
}
