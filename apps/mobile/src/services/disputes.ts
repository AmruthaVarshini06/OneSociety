import apiClient from '../api/client';

export interface GroupBuyIssue {
  _id: string;
  groupOrderId: string;
  deliveryPassId: string;
  commitmentId: string;
  societyId: string;
  flatId: string;
  flatLabel?: string;
  residentUserId: string;
  residentName?: string;
  supplierId: string;
  item: {
    productName: string;
    quantity: number;
  };
  issueType: 'QUALITY' | 'QUANTITY_SHORT' | 'MISSING_ITEM';
  description: string;
  photoUrls: string[];
  refundAmountPaise: number;
  status: 'OPEN' | 'RESOLVED_REFUND' | 'RESOLVED_REPLACEMENT' | 'ESCALATED' | 'CLOSED';
  supplierResponse?: {
    action: 'REFUND' | 'REPLACEMENT' | 'REJECT';
    note?: string;
    replacementDate?: string;
    respondedAt?: string;
  };
  presidentResolution?: {
    decision: 'REFUND' | 'REPLACEMENT' | 'DISMISS';
    note?: string;
    resolvedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyRating {
  _id: string;
  groupOrderId: string;
  societyId: string;
  flatId: string;
  residentUserId: string;
  supplierId: string;
  productRating: number;
  productComment?: string;
  supplierRating: number;
  supplierComment?: string;
  createdAt: string;
}

export async function reportIssue(
  orderId: string,
  data: {
    productName: string;
    quantity: number;
    issueType: string;
    description: string;
    photoUrls?: string[];
  },
): Promise<{ message: string; issue: GroupBuyIssue }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/issues`, data);
  return res.data;
}

export async function listIssues(orderId: string): Promise<{ issues: GroupBuyIssue[] }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/issues`);
  return res.data;
}

export async function supplierRespondIssue(
  orderId: string,
  issueId: string,
  data: { action: 'REFUND' | 'REPLACEMENT' | 'REJECT'; note?: string; replacementDate?: string },
): Promise<{ message: string; issue: GroupBuyIssue }> {
  const res = await apiClient.patch(
    `/api/v1/group-buying/orders/${orderId}/issues/${issueId}/respond`,
    data,
  );
  return res.data;
}

export async function escalateIssue(
  orderId: string,
  issueId: string,
): Promise<{ message: string; issue: GroupBuyIssue }> {
  const res = await apiClient.patch(
    `/api/v1/group-buying/orders/${orderId}/issues/${issueId}/escalate`,
  );
  return res.data;
}

export async function presidentResolveIssue(
  orderId: string,
  issueId: string,
  data: { decision: 'REFUND' | 'REPLACEMENT' | 'DISMISS'; note?: string },
): Promise<{ message: string; issue: GroupBuyIssue }> {
  const res = await apiClient.patch(
    `/api/v1/group-buying/orders/${orderId}/issues/${issueId}/resolve-president`,
    data,
  );
  return res.data;
}

export async function submitRating(
  orderId: string,
  data: {
    productRating: number;
    productComment?: string;
    supplierRating: number;
    supplierComment?: string;
  },
): Promise<{ message: string; rating: GroupBuyRating }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/ratings`, data);
  return res.data;
}

export async function getMyRating(
  orderId: string,
): Promise<{ rating: GroupBuyRating | null }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/ratings/mine`);
  return res.data;
}

export async function settleOrderEscrow(
  orderId: string,
): Promise<{
  message: string;
  totalPaidPaise: number;
  totalRefundedPaise: number;
  netPayoutPaise: number;
  status: string;
}> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/settle`);
  return res.data;
}
