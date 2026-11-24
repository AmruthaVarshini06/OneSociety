import apiClient from '../api/client';

export const getAgreement = (id: string) =>
  apiClient.get(`/api/v1/services/agreements/${id}`);

export const proposeRevision = (id: string, newPricePaise: number, reason: string) =>
  apiClient.post(`/api/v1/services/agreements/${id}/propose-revision`, { newPricePaise, reason });

export const respondToRevision = (id: string, action: 'ACCEPT' | 'REJECT') =>
  apiClient.patch(`/api/v1/services/agreements/${id}/revision-response`, { action });

export const terminateAgreement = (id: string, reason: string, noticeDays?: number) =>
  apiClient.post(`/api/v1/services/agreements/${id}/terminate`, { reason, noticeDays });

export const completeAgreement = (id: string) =>
  apiClient.post(`/api/v1/services/agreements/${id}/complete`);
