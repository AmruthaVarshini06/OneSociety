import apiClient from '../api/client';

export interface QrPassDto {
  _id: string;
  passType: 'FAMILY' | 'PRESIDENT' | 'SERVICE_PROVIDER' | 'VISITOR' | 'EVENT_GUEST';
  passCode: string;
  ownerName: string;
  flatCode?: string;
  visitorName?: string;
  visitorPhone?: string;
  purpose?: string;
  expectedPeople: number;
  peopleCurrentlyInside: number;
  peopleEnteredTotal: number;
  peopleExitedTotal: number;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  serviceCategory?: string;
  servicePhotoUrl?: string;
  isEventGuestPass?: boolean;
}

export interface GateDashboardDto {
  totalInside: number;
  breakdown: {
    residents: number;
    visitors: number;
    providers: number;
    delivery: number;
  };
  recentEvents: Array<{
    _id: string;
    passCode: string;
    passType: string;
    direction: 'ENTRY' | 'EXIT';
    count: number;
    scannedAt: string;
    guardName: string;
    flatCode?: string;
    visitorOrOwnerName: string;
  }>;
  alerts: string[];
}

export interface ManualVisitorDto {
  _id: string;
  visitorType: 'VISITOR' | 'DELIVERY';
  visitorName: string;
  phone?: string;
  vehicleNumber?: string;
  flatCode: string;
  purpose: string;
  deliveryCompany?: string;
  inTime: string;
  outTime?: string;
  peopleCount: number;
  status: 'ALLOWED' | 'DENIED' | 'EXITED';
  deniedReason?: string;
  acceptedParcelAtGate?: boolean;
  guardName: string;
}

export interface FlatPresenceDto {
  flatId?: string;
  flatCode: string;
  status?: 'PRESENT' | 'NOT_PRESENT';
  isAtHome?: boolean;
  lastUpdated?: string;
  atHomeUpdatedAt?: string;
  isStale?: boolean;
  activeEventTitle?: string;
}

export interface MaintenanceAccountsDto {
  currentBalancePaise: number;
  openingBalancePaise: number;
  openingDate: string;
  totalIncomePaise: number;
  totalExpensePaise: number;
  monthlyChartData: Array<{
    month: string;
    incomeRs: number;
    expenseRs: number;
  }>;
  categorySpending: Array<{
    category: string;
    amountPaise: number;
    amountRs: number;
    budgetRs: number;
    sharePercent: number;
  }>;
  efficiencyIndicators: {
    proofSharePercent: number;
    complaintLinkedSharePercent: number;
    monthsBalanceRemaining: number;
    collectionRatePercent: number;
  };
  entries: Array<{
    _id: string;
    entryNumber: string;
    entryType: 'INCOME' | 'EXPENSE';
    date: string;
    category: string;
    amountPaise: number;
    payeeOrPayer: string;
    paymentMode: string;
    description: string;
    proofPhotos: string[];
    linkedComplaintId?: string;
    linkedComplaintNumber?: string;
    isComplaintConfirmed?: boolean;
    guardPayrollUserId?: string;
    payrollMonth?: string;
  }>;
}

export interface MaintenanceDueDto {
  _id: string;
  flatCode: string;
  billingMonth: string;
  amountPaise: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAmountPaise?: number;
  paidAt?: string;
  paymentMode?: string;
  receiptNumber?: string;
}

export interface CommunityEventDto {
  _id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  dailyTimeFrom: string;
  dailyTimeTo: string;
  hostFlatCode: string;
  estimatedVisitors: number;
  hasLoudSound: boolean;
  loudSoundType?: string;
  loudSoundEndTime?: string;
  expectedVehicles: number;
  useCommonAreas: boolean;
  notes?: string;
  guestPassCode?: string;
  guestsEnteredCount: number;
  isQuietHoursFlagged: boolean;
  quietHoursWarning?: string;
  presidentNotes?: string;
  isOverEstimateAlertSent: boolean;
}

export interface EmergencyAlertDto {
  _id: string;
  flatCode: string;
  block: string;
  status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'CANCELLED';
  triggeredAt: string;
  acknowledgedByGuardName?: string;
  acknowledgedAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export const getMyFamilyPass = () =>
  apiClient.get<QrPassDto>('/api/v1/society-help/gate/passes/family');

export const getMyPresidentPass = () =>
  apiClient.get<QrPassDto>('/api/v1/society-help/gate/passes/president');

export const getMyProviderPass = () =>
  apiClient.get<QrPassDto>('/api/v1/society-help/gate/passes/provider');

export const listMyPasses = () =>
  apiClient.get<QrPassDto[]>('/api/v1/society-help/gate/passes/my-passes');

export const createVisitorPass = (data: {
  visitorName: string;
  visitorPhone?: string;
  purpose?: string;
  validFrom?: string;
  validUntil?: string;
  expectedPeople?: number;
  vehicleNumber?: string;
}) => apiClient.post<QrPassDto>('/api/v1/society-help/gate/passes/visitor', data);

export const getVisitorPassByCode = (passCode: string) =>
  apiClient.get<QrPassDto>(`/api/v1/society-help/gate/passes/code/${passCode}`);

export const revokePass = (passId: string, reason?: string) =>
  apiClient.post(`/api/v1/society-help/gate/passes/${passId}/revoke`, { reason });

export const scanPass = (passCode: string) =>
  apiClient.post<any>('/api/v1/society-help/gate/scan', { passCode });

export const confirmScan = (data: {
  passId: string;
  direction: 'ENTRY' | 'EXIT';
  count: number;
  notes?: string;
}) => apiClient.post<any>('/api/v1/society-help/gate/scan/confirm', data);

export const getLiveGateDashboard = () =>
  apiClient.get<GateDashboardDto>('/api/v1/society-help/gate/dashboard');

export const logManualVisitor = (data: {
  visitorType: 'VISITOR' | 'DELIVERY';
  visitorName: string;
  phone?: string;
  vehicleNumber?: string;
  flatCode: string;
  purpose: string;
  deliveryCompany?: string;
  inTime?: string;
  peopleCount?: number;
  acceptedParcelAtGate?: boolean;
  notes?: string;
}) => apiClient.post<ManualVisitorDto>('/api/v1/society-help/gate/manual-visitor', data);

export const markManualVisitorExit = (logId: string) =>
  apiClient.post(`/api/v1/society-help/gate/manual-visitor/${logId}/exit`, {});

export const getCurrentlyInside = () =>
  apiClient.get<{
    manualVisitors: ManualVisitorDto[];
    passesInside: QrPassDto[];
    totalInsideManual: number;
    totalInsidePasses: number;
  }>('/api/v1/society-help/gate/inside');

export const recordHandover = (data: { notes: string; toGuardId?: string }) =>
  apiClient.post('/api/v1/society-help/gate/handover', data);

export const getPresenceStatus = () =>
  apiClient.get<FlatPresenceDto>('/api/v1/society-help/gate/presence');

export const updatePresenceStatus = (data: { isAtHome: boolean; awayUntil?: string }) =>
  apiClient.post<FlatPresenceDto>('/api/v1/society-help/gate/presence', data);

export const searchFlatPresence = (flatCode: string) =>
  apiClient.get<FlatPresenceDto[]>('/api/v1/society-help/gate/presence/search', {
    params: { flatCode },
  });

export const getMaintenancePlan = () =>
  apiClient.get<any>('/api/v1/society-help/maintenance/plan');

export const getMaintenanceAccounts = () =>
  apiClient.get<MaintenanceAccountsDto>('/api/v1/society-help/maintenance/accounts');

export const getMaintenanceDues = (month?: string) =>
  apiClient.get<MaintenanceDueDto[]>('/api/v1/society-help/maintenance/dues', {
    params: { month },
  });

export const payMaintenanceDue = (dueId: string, amountPaise?: number) =>
  apiClient.post<MaintenanceDueDto>(`/api/v1/society-help/maintenance/dues/${dueId}/pay`, {
    amountPaise,
  });

export const recordOfflineMaintenancePayment = (
  dueId: string,
  data: { amountPaise?: number; paymentMode?: string; receiptNumber?: string }
) =>
  apiClient.post<MaintenanceDueDto>(
    `/api/v1/society-help/maintenance/dues/${dueId}/offline`,
    data
  );

export const recordExpense = (data: {
  category: string;
  amountPaise: number;
  payee: string;
  paymentMode?: string;
  description?: string;
  proofPhotos: string[];
  date?: string;
  linkedComplaintId?: string;
}) => apiClient.post('/api/v1/society-help/maintenance/expenses', data);

export const recordOtherIncome = (data: {
  category: string;
  amountPaise: number;
  payer: string;
  paymentMode?: string;
  description?: string;
  proofPhotos?: string[];
}) => apiClient.post('/api/v1/society-help/maintenance/incomes', data);

export const recordWatchmanSalary = (data: {
  guardUserId: string;
  month: string;
  amountPaise: number;
  reference?: string;
  proofPhoto?: string;
}) => apiClient.post('/api/v1/society-help/maintenance/payroll/watchman', data);

export const getGuardSalaryRecords = () =>
  apiClient.get<any[]>('/api/v1/society-help/maintenance/payroll/guard');

export const linkComplaintExpense = (complaintClusterId: string) =>
  apiClient.post('/api/v1/society-help/maintenance/expenses/link-complaint', {
    complaintClusterId,
  });

export const raiseExpenseQuery = (ledgerEntryId: string, question: string) =>
  apiClient.post(`/api/v1/society-help/maintenance/ledger/${ledgerEntryId}/query`, {
    question,
  });

export const getExpenseQueries = (ledgerEntryId: string) =>
  apiClient.get<any[]>(`/api/v1/society-help/maintenance/ledger/${ledgerEntryId}/queries`);

export const replyExpenseQuery = (queryId: string, answer: string) =>
  apiClient.post(`/api/v1/society-help/maintenance/queries/${queryId}/reply`, {
    answer,
  });

export const createCommunityEvent = (data: {
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  dailyTimeFrom?: string;
  dailyTimeTo?: string;
  estimatedVisitors?: number;
  hasLoudSound?: boolean;
  loudSoundType?: string;
  loudSoundEndTime?: string;
  expectedVehicles?: number;
  useCommonAreas?: boolean;
  notes?: string;
}) => apiClient.post<CommunityEventDto>('/api/v1/society-help/events', data);

export const getEventsDashboard = () =>
  apiClient.get<{
    today: CommunityEventDto[];
    upcoming: CommunityEventDto[];
    past: CommunityEventDto[];
  }>('/api/v1/society-help/events/dashboard');

export const addPresidentEventNote = (eventId: string, note: string) =>
  apiClient.post(`/api/v1/society-help/events/${eventId}/note`, { note });

export const triggerEmergencyAlert = (notes?: string) =>
  apiClient.post<EmergencyAlertDto>('/api/v1/society-help/emergency/trigger', { notes });

export const acknowledgeEmergencyAlert = (alertId: string, notes?: string) =>
  apiClient.post<EmergencyAlertDto>(`/api/v1/society-help/emergency/alert/${alertId}/ack`, {
    notes,
  });

export const cancelEmergencyAlert = (alertId: string, reason?: string) =>
  apiClient.post<EmergencyAlertDto>(
    `/api/v1/society-help/emergency/alert/${alertId}/cancel`,
    { reason }
  );

export const getActiveEmergencyAlerts = () =>
  apiClient.get<EmergencyAlertDto[]>('/api/v1/society-help/emergency/active');

export const getEmergencyAlertHistory = (limit?: number) =>
  apiClient.get<EmergencyAlertDto[]>('/api/v1/society-help/emergency/history', {
    params: { limit },
  });
