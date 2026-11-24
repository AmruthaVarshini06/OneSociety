import Razorpay from 'razorpay';
import crypto from 'crypto';

function isMockMode(): boolean {
  return !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
}

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  currency = 'INR',
): Promise<RazorpayOrderResult> {
  if (isMockMode()) {
    console.info(`[RAZORPAY MOCK] createOrder receipt=${receipt} amount=${amountPaise}`);
    return { id: `mock_order_${receipt}`, amount: amountPaise, currency, receipt };
  }
  const rz = getRazorpayClient();
  const order = await rz.orders.create({ amount: amountPaise, currency, receipt });
  return {
    id: order.id,
    amount: typeof order.amount === 'string' ? parseInt(order.amount, 10) : order.amount,
    currency: order.currency,
    receipt: order.receipt ?? receipt,
  };
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  if (isMockMode()) {
    const valid = signature.startsWith('MOCK_SIG_');
    console.info(`[RAZORPAY MOCK] verifySignature → ${valid}`);
    return valid;
  }
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}
