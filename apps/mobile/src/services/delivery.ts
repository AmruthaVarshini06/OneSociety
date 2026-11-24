import apiClient from '../api/client';

export interface DeliveryPassItem {
  productName: string;
  quantity: number;
  unit: string;
}

export interface DeliveryPass {
  _id: string;
  groupOrderId: string;
  societyId: string;
  flatId: string;
  flatLabel?: string;
  residentName?: string;
  residentUserId: string;
  commitmentId: string;
  deliveryType: 'SOCIETY_GATE' | 'DOOR_TO_DOOR';
  qrToken: string;
  items: DeliveryPassItem[];
  packageCount: number;
  storageLocation: string;
  status: 'GENERATED' | 'AT_GATE' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  deliveredAt?: string;
  verificationMethod?: string;
  fallbackOtp?: string;
  expiresAt: string;
  order?: {
    productName: string;
    unit: string;
    status: string;
  };
}

export interface DeliveryManifest {
  _id: string;
  groupOrderId: string;
  societyId: string;
  supplierId: string;
  deliveryType: 'SOCIETY_GATE' | 'DOOR_TO_DOOR';
  dispatchedAt: string;
  promisedDeliveryDate: string;
  storageLocation: string;
  totalPackagesDeclared: number;
  totalPackagesReceived?: number;
  status: 'DISPATCHED' | 'ACCEPTED_AT_GATE' | 'COMPLETED';
}

export interface ManifestResponse {
  manifest: DeliveryManifest | null;
  passes: DeliveryPass[];
  stats: { total: number; delivered: number; pending: number };
}

export interface GatePickupsResponse {
  storageLocation: string;
  pickups: Array<{
    _id: string;
    flatId: string;
    flatLabel: string;
    residentName: string;
    items: DeliveryPassItem[];
    packageCount: number;
    qrToken: string;
    status: string;
    deliveredAt?: string;
    fallbackOtp?: string;
  }>;
}

export async function dispatchOrder(
  orderId: string,
  data: {
    promisedDeliveryDate: string;
    deliveryType: string;
    storageLocation: string;
    totalPackagesDeclared: number;
  },
): Promise<{ message: string; manifest: DeliveryManifest; passesCreated: number }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/delivery/dispatch`, data);
  return res.data;
}

export async function getDeliveryManifest(orderId: string): Promise<ManifestResponse> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/delivery/manifest`);
  return res.data;
}

export async function acceptGateManifest(
  orderId: string,
  data: { packagesReceived: number; notes?: string },
): Promise<{ message: string; manifest: DeliveryManifest }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/delivery/gate/accept`, data);
  return res.data;
}

export async function getGatePickups(orderId: string): Promise<GatePickupsResponse> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/delivery/gate/pickups`);
  return res.data;
}

export async function getMyDeliveryPass(orderId: string): Promise<{ pass: DeliveryPass | null }> {
  const res = await apiClient.get(`/api/v1/group-buying/orders/${orderId}/delivery/pass/mine`);
  return res.data;
}

export async function verifyDeliveryQr(
  orderId: string,
  qrToken: string,
): Promise<{ message: string; pass: DeliveryPass }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/delivery/verify-qr`, {
    qrToken,
  });
  return res.data;
}

export async function requestOtpFallback(
  orderId: string,
  flatId: string,
): Promise<{ message: string; demoOtp: string }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/delivery/request-otp`, {
    flatId,
  });
  return res.data;
}

export async function verifyOtpFallback(
  orderId: string,
  data: { flatId: string; otp: string; overrideReason: string },
): Promise<{ message: string; pass: DeliveryPass }> {
  const res = await apiClient.post(`/api/v1/group-buying/orders/${orderId}/delivery/verify-otp`, data);
  return res.data;
}
