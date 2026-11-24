import { createRazorpayOrder, verifyRazorpaySignature } from './razorpay.adapter';

describe('RazorpayAdapter (mock mode)', () => {
  const originalKeyId = process.env.RAZORPAY_KEY_ID;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  afterAll(() => {
    if (originalKeyId) process.env.RAZORPAY_KEY_ID = originalKeyId;
    if (originalKeySecret) process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
  });

  it('creates a mock order with expected id and amount', async () => {
    const res = await createRazorpayOrder(50000, 'receipt_123');
    expect(res.id).toBe('mock_order_receipt_123');
    expect(res.amount).toBe(50000);
    expect(res.currency).toBe('INR');
    expect(res.receipt).toBe('receipt_123');
  });

  it('verifies signatures correctly in mock mode', () => {
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'MOCK_SIG_valid_sig')).toBe(true);
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'MOCK_SIG_anything')).toBe(true);
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'INVALID_SIG')).toBe(false);
    expect(verifyRazorpaySignature('order_1', 'pay_1', '')).toBe(false);
  });
});
