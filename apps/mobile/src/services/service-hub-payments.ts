import apiClient from '../api/client';

export const getSeekerPayments = () =>
  apiClient.get('/api/v1/services/payments');

export const getProviderEarnings = () =>
  apiClient.get('/api/v1/services/payments/earnings');

export const recordPayment = (
  paymentId: string,
  amountPaise: number,
  mode: 'IN_APP' | 'CASH' | 'UPI_OFFLINE',
  offlineReference?: string,
) =>
  apiClient.post(`/api/v1/services/payments/${paymentId}/pay`, {
    amountPaise,
    mode,
    offlineReference,
  });

export const confirmReceipt = (paymentId: string) =>
  apiClient.post(`/api/v1/services/payments/${paymentId}/confirm-receipt`);
