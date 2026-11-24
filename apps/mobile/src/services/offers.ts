import apiClient from '../api/client';
import type { PriceTier } from './group-orders';

export interface SupplierOffer {
  _id: string;
  groupOrderId: string;
  societyId: string;
  supplierId: {
    _id: string;
    businessName: string;
    contactName: string;
    contactPhone: string;
    gstVerified: boolean;
  } | string;
  tiers: PriceTier[];
  deliveryDays: number;
  note?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export async function submitOffer(
  orderId: string,
  payload: { tiers: PriceTier[]; deliveryDays: number; note?: string },
): Promise<{ offer: SupplierOffer; message: string }> {
  const res = await apiClient.put(`/api/v1/group-buying/orders/${orderId}/offers`, payload);
  return res.data;
}

export async function getMyOffer(orderId: string): Promise<{ offer: SupplierOffer | null }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/offers/mine`);
  return res.data;
}

export async function listOffers(orderId: string): Promise<{ offers: SupplierOffer[] }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/offers`);
  return res.data;
}

export async function selectOffer(
  orderId: string,
  offerId: string,
  note?: string,
): Promise<{ offer: SupplierOffer; message: string }> {
  const res = await apiClient.post(
    `/api/v1/group-buying/orders/${orderId}/offers/${offerId}/select`,
    { note },
  );
  return res.data;
}
