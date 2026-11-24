import {
  calculateOrderSettlement,
  computeAverageRating,
} from './settlement.calc';

describe('Settlement and Rating Calculations', () => {
  describe('calculateOrderSettlement', () => {
    it('correctly calculates full payout when there are no refunds', () => {
      const commitments = [
        { commitmentId: 'c1', totalAmountPaise: 50000 },
        { commitmentId: 'c2', totalAmountPaise: 30000 },
      ];
      const issues: any[] = [];

      const result = calculateOrderSettlement(commitments, issues);
      expect(result.totalPaidPaise).toBe(80000);
      expect(result.totalRefundedPaise).toBe(0);
      expect(result.netSupplierPayoutPaise).toBe(80000);
      expect(result.commitmentPayouts).toHaveLength(2);
      expect(result.commitmentPayouts[0].payoutPaise).toBe(50000);
    });

    it('deducts resolved refunds from supplier payout', () => {
      const commitments = [
        { commitmentId: 'c1', totalAmountPaise: 50000 },
        { commitmentId: 'c2', totalAmountPaise: 30000 },
      ];
      const issues = [
        { commitmentId: 'c1', refundAmountPaise: 10000, status: 'RESOLVED_REFUND' },
        { commitmentId: 'c2', refundAmountPaise: 5000, status: 'OPEN' }, // open issue, not resolved refund
      ];

      const result = calculateOrderSettlement(commitments, issues);
      expect(result.totalPaidPaise).toBe(80000);
      expect(result.totalRefundedPaise).toBe(10000);
      expect(result.netSupplierPayoutPaise).toBe(70000);
      expect(result.commitmentPayouts[0].refundedPaise).toBe(10000);
      expect(result.commitmentPayouts[0].payoutPaise).toBe(40000);
      expect(result.commitmentPayouts[1].refundedPaise).toBe(0);
      expect(result.commitmentPayouts[1].payoutPaise).toBe(30000);
    });

    it('caps payout deduction to total paid amount', () => {
      const commitments = [{ commitmentId: 'c1', totalAmountPaise: 20000 }];
      const issues = [
        { commitmentId: 'c1', refundAmountPaise: 25000, status: 'RESOLVED_REFUND' },
      ];

      const result = calculateOrderSettlement(commitments, issues);
      expect(result.netSupplierPayoutPaise).toBe(0);
    });
  });

  describe('computeAverageRating', () => {
    it('computes rounded average rating', () => {
      expect(computeAverageRating([5, 4, 4, 5])).toEqual({ average: 4.5, count: 4 });
      expect(computeAverageRating([5, 4, 3])).toEqual({ average: 4, count: 3 });
      expect(computeAverageRating([5, 5, 4, 4, 3])).toEqual({ average: 4.2, count: 5 });
    });

    it('handles empty rating list', () => {
      expect(computeAverageRating([])).toEqual({ average: 0, count: 0 });
    });
  });
});
