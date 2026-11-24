import apiClient from '../api/client';

export interface Commitment {
  _id: string;
  groupOrderId: string;
  societyId: string;
  flatId: string;
  userId: string;
  quantityWanted: number;
  pricePerUnit: number;
  totalAmountPaise: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  escrowEntryId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitmentSummaryItem {
  _id: string;
  flatNumber: string;
  residentName: string;
  quantityWanted: number;
  pricePerUnit: number;
  totalAmountPaise: number;
  status: string;
  paidAt?: string;
}

export interface CommitmentSummary {
  counts: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    refunded: number;
  };
  totalPaidPaise: number;
  totalPaidUnits: number;
  commitments: CommitmentSummaryItem[];
}

export interface InitiatePaymentResult {
  message: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export async function getMyCommitment(orderId: string): Promise<{ commitment: Commitment | null }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/commitments/mine`);
  return res.data;
}

export async function initiatePayment(orderId: string): Promise<InitiatePaymentResult> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/commitments/mine/pay/initiate`);
  return res.data;
}

export async function confirmPayment(
  orderId: string,
  data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  },
): Promise<{ message: string; commitment: Commitment }> {
  const res = await apiClient.post(
    `/api/v1/group-buying/orders/${orderId}/commitments/mine/pay/confirm`,
    data,
  );
  return res.data;
}

export async function getCommitmentSummary(orderId: string): Promise<CommitmentSummary> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/commitments`);
  return res.data;
}

export async function openOrder(
  orderId: string,
): Promise<{ message: string; commitmentsCount: number }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/commitments/open`);
  return res.data;
}

export async function openPaymentWindow(
  orderId: string,
  paymentDeadlineHours: number = 48,
): Promise<{ message: string }> {
  const res = await apiClient.post(
    `/api/v1/group-buying/orders/${orderId}/commitments/open-payment`,
    { paymentDeadlineHours },
  );
  return res.data;
}

export async function closePaymentWindow(orderId: string): Promise<{ message: string }> {
  const res = await apiClient.post(
    `/api/v1/group-buying/orders/${orderId}/commitments/close-payment`,
  );
  return res.data;
}
