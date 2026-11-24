import apiClient from '../api/client';

export const getMessages = (requestId: string) =>
  apiClient.get(`/api/v1/services/chat/${requestId}`);

export const sendMessage = (requestId: string, text: string) =>
  apiClient.post(`/api/v1/services/chat/${requestId}/message`, { text });

export const sendPriceOffer = (requestId: string, offer: Record<string, unknown>) =>
  apiClient.post(`/api/v1/services/chat/${requestId}/price-offer`, offer);

export const respondToPriceOffer = (
  requestId: string,
  offerId: string,
  action: string,
  counterOffer?: Record<string, unknown>,
) =>
  apiClient.patch(`/api/v1/services/chat/${requestId}/price-offer/${offerId}`, {
    action,
    counterOffer,
  });
