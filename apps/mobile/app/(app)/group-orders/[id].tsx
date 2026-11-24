import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  ProgressBar,
  Divider,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import {
  getGroupOrder,
  getMyDemand,
  upsertDemand,
  retractDemand,
  cancelGroupOrder,
} from '../../../src/services/group-orders';
import { getSocket } from '../../../src/services/socket';

const STATUS_COLORS: Record<string, string> = {
  DEMAND_OPEN: '#1565C0',
  OFFERS_OPEN: '#7B1FA2',
  COMPLETED: '#4CAF50',
  CANCELLED: '#9E9E9E',
  FAILED: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  DEMAND_OPEN: 'Demand Open',
  OFFERS_OPEN: 'Awaiting Offers',
  SUPPLIER_SELECTED: 'Supplier Selected',
  GROUP_ORDER_OPEN: 'Order Open',
  PAYMENT_WINDOW: 'Payment Window',
  DELIVERY_PENDING: 'Delivery Pending',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

function timeLeft(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return 'Demand window closed';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)} days left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function GroupOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;
  const userId = user?.userId;
  const queryClient = useQueryClient();

  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [quantityError, setQuantityError] = useState('');

  const { data: orderData, isLoading, isError, refetch } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const { data: myDemandData, refetch: refetchMyDemand } = useQuery({
    queryKey: ['my-demand', id],
    queryFn: () => getMyDemand(id),
    enabled: !!id && (role === 'resident' || role === 'president'),
  });

  useEffect(() => {
    if (myDemandData?.item) {
      setQuantityInput(String(myDemandData.item.quantityWanted));
    }
  }, [myDemandData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (payload: { groupOrderId: string; totalDemandedQuantity: number }) => {
      if (payload.groupOrderId === id) {
        setLiveTotal(payload.totalDemandedQuantity);
        queryClient.invalidateQueries({ queryKey: ['group-orders'] });
      }
    };
    socket.on('grouporder:demand_updated', handler);
    return () => { socket.off('grouporder:demand_updated', handler); };
  }, [id, queryClient]);

  const upsertMutation = useMutation({
    mutationFn: () => {
      const qty = parseInt(quantityInput, 10);
      if (!qty || qty < 1) throw new Error('Enter a valid quantity');
      return upsertDemand(id, qty);
    },
    onSuccess: (result) => {
      setLiveTotal(result.totalDemandedQuantity);
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      refetchMyDemand();
      Alert.alert('Done', 'Your demand has been recorded.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as Error).message ?? 'Failed';
      Alert.alert('Error', msg);
    },
  });

  const retractMutation = useMutation({
    mutationFn: () => retractDemand(id),
    onSuccess: (result) => {
      setLiveTotal(result.totalDemandedQuantity);
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      refetchMyDemand();
      Alert.alert('Done', 'Your demand has been retracted.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed';
      Alert.alert('Error', msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelGroupOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['group-orders'] });
      Alert.alert('Cancelled', 'The demand window has been cancelled.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed';
      Alert.alert('Error', msg);
    },
  });

  const handleCancel = () => {
    Alert.prompt(
      'Cancel Order',
      'Enter a reason for cancellation:',
      (reason) => {
        if (reason?.trim()) cancelMutation.mutate(reason.trim());
      },
      'plain-text',
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading order…</Text>
      </View>
    );
  }

  if (isError || !orderData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load order.</Text>
        <Button onPress={() => refetch()} style={{ marginTop: 12 }}>Retry</Button>
      </View>
    );
  }

  const { order } = orderData;
  const total = liveTotal ?? order.totalDemandedQuantity;
  const progress = Math.min(total / order.minimumQuantity, 1);
  const pct = Math.round(progress * 100);
  const color = STATUS_COLORS[order.status] ?? '#9E9E9E';
  const isDemandOpen = order.status === 'DEMAND_OPEN';
  const canInteract = isDemandOpen && (role === 'resident' || role === 'president');
  const myQty = myDemandData?.item?.quantityWanted ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {}
        <View style={styles.headerRow}>
          <Chip style={[styles.statusChip, { backgroundColor: color }]} textStyle={styles.statusChipText}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Chip>
          {isDemandOpen && (
            <Text variant="bodySmall" style={styles.timer}>⏱ {timeLeft(order.demandCloseAt)}</Text>
          )}
        </View>

        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="headlineSmall" style={styles.productName}>{order.productName}</Text>
            <Text variant="bodySmall" style={styles.category}>{order.productCategory}</Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.description}>{order.description}</Text>
          </Card.Content>
        </Card>

        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Demand Progress</Text>
            <Divider style={styles.divider} />
            <View style={styles.progressLabelRow}>
              <Text variant="bodyMedium" style={styles.boldText}>
                {total} {order.unit}
              </Text>
              <Text variant="bodySmall" style={styles.mutedText}>
                of {order.minimumQuantity} {order.unit} minimum
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={progress >= 1 ? '#4CAF50' : color}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={[styles.pctText, { color: progress >= 1 ? '#4CAF50' : color }]}>
              {pct}% of minimum reached
              {progress >= 1 ? ' ✅ Minimum met!' : ''}
            </Text>

            {}
            {order.tiers && order.tiers.length > 0 && (
              <View style={styles.tierSection}>
                <Text variant="titleSmall" style={styles.tierTitle}>Price Tiers</Text>
                {order.tiers.map((tier, i) => {
                  const active = total >= tier.minQuantity;
                  return (
                    <View key={i} style={[styles.tierRow, active && styles.tierActive]}>
                      <Text variant="bodySmall" style={active ? styles.tierActiveText : styles.tierText}>
                        {tier.minQuantity}+ {order.unit}
                      </Text>
                      <Text variant="bodySmall" style={active ? styles.tierActiveText : styles.tierText}>
                        {formatPaise(tier.pricePerUnit)} / {order.unit}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>

        {}
        {canInteract && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>My Demand</Text>
              <Divider style={styles.divider} />
              {myQty > 0 && (
                <Text variant="bodyMedium" style={styles.myQtyText}>
                  Current: {myQty} {order.unit}
                </Text>
              )}
              <TextInput
                label={`Quantity (${order.unit})`}
                value={quantityInput}
                onChangeText={(v) => {
                  setQuantityInput(v.replace(/[^0-9]/g, ''));
                  setQuantityError('');
                }}
                mode="outlined"
                keyboardType="number-pad"
                error={!!quantityError}
                style={styles.qtyInput}
              />
              {quantityError ? <Text style={styles.qtyError}>{quantityError}</Text> : null}
              <View style={styles.demandActions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    const qty = parseInt(quantityInput, 10);
                    if (!qty || qty < 1) { setQuantityError('Enter a valid quantity'); return; }
                    setQuantityError('');
                    upsertMutation.mutate();
                  }}
                  loading={upsertMutation.isPending}
                  disabled={upsertMutation.isPending || retractMutation.isPending}
                  style={styles.demandBtn}
                >
                  {myQty > 0 ? 'Update Demand' : 'Express Demand'}
                </Button>
                {myQty > 0 && (
                  <Button
                    mode="outlined"
                    onPress={() => retractMutation.mutate()}
                    loading={retractMutation.isPending}
                    disabled={upsertMutation.isPending || retractMutation.isPending}
                    textColor="#F44336"
                  >
                    Retract
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {}
        {role === 'president' && isDemandOpen && (
          <Button
            mode="outlined"
            textColor="#F44336"
            onPress={handleCancel}
            loading={cancelMutation.isPending}
            disabled={cancelMutation.isPending}
            style={styles.cancelBtn}
          >
            Cancel Demand Window
          </Button>
        )}

        {}
        {role === 'president' && order.status === 'OFFERS_OPEN' && (
          <Button
            mode="contained"
            icon="gavel"
            onPress={() =>
              router.push(`/(app)/group-orders/offers/list?orderId=${order._id}` as never)
            }
            style={[styles.cancelBtn, { backgroundColor: '#7B1FA2' }]}
          >
            View Supplier Offers
          </Button>
        )}

        {}
        {role === 'supplier' && order.status === 'OFFERS_OPEN' && (
          <Button
            mode="contained"
            icon="tag"
            onPress={() =>
              router.push(`/(app)/group-orders/offers/submit?orderId=${order._id}` as never)
            }
            style={[styles.cancelBtn, { backgroundColor: '#7B1FA2' }]}
          >
            Submit / Update Offer
          </Button>
        )}
        {role === 'supplier' && ['OFFERS_OPEN', 'SUPPLIER_SELECTED', 'GROUP_ORDER_OPEN'].includes(order.status) && (
          <Button
            mode="outlined"
            icon="eye"
            onPress={() =>
              router.push(`/(app)/group-orders/offers/mine?orderId=${order._id}` as never)
            }
            style={styles.cancelBtn}
          >
            View My Offer
          </Button>
        )}
        {}
        {(role === 'resident' || role === 'president') &&
          ['GROUP_ORDER_OPEN', 'PAYMENT_WINDOW', 'DELIVERY_PENDING'].includes(order.status) && (
            <Button
              mode="contained"
              icon="credit-card"
              onPress={() =>
                router.push(`/(app)/group-orders/payment?id=${order._id}` as never)
              }
              style={[styles.cancelBtn, { backgroundColor: '#1565C0' }]}
            >
              {order.status === 'PAYMENT_WINDOW' ? 'Pay Now via Escrow' : 'View My Commitment'}
            </Button>
          )}

        {}
        {role === 'president' &&
          [
            'SUPPLIER_SELECTED',
            'GROUP_ORDER_OPEN',
            'PAYMENT_WINDOW',
            'DELIVERY_PENDING',
            'DELIVERED',
            'COMPLETED',
            'FAILED',
          ].includes(order.status) && (
            <Button
              mode="contained"
              icon="shield-check"
              onPress={() =>
                router.push(`/(app)/group-orders/commitments?id=${order._id}` as never)
              }
              style={[styles.cancelBtn, { backgroundColor: '#2E7D32' }]}
            >
              Manage Commitments & Escrow
            </Button>
          )}
        {}
        {(role === 'supplier' || role === 'president') && order.status === 'DELIVERY_PENDING' && (
          <Button
            mode="contained"
            icon="truck-fast"
            onPress={() => router.push(`/(app)/group-orders/dispatch?id=${order._id}` as never)}
            style={[styles.cancelBtn, { backgroundColor: '#2E7D32' }]}
          >
            Dispatch Order & Generate Passes
          </Button>
        )}

        {}
        {(role === 'resident' || role === 'president') &&
          ['DISPATCHED', 'DELIVERING', 'DELIVERED'].includes(order.status) && (
            <Button
              mode="contained"
              icon="qrcode-scan"
              onPress={() => router.push(`/(app)/group-orders/pickup?id=${order._id}` as never)}
              style={[styles.cancelBtn, { backgroundColor: '#0277BD' }]}
            >
              View Delivery Pass & QR
            </Button>
          )}

        {}
        {role === 'guard' && (
          <Button
            mode="contained"
            icon="shield-account"
            onPress={() => router.push('/(app)/guard/deliveries' as never)}
            style={[styles.cancelBtn, { backgroundColor: '#1565C0' }]}
          >
            Gate Deliveries & Pickups
          </Button>
        )}
        {}
        {(role === 'resident' || role === 'president') &&
          ['DELIVERED', 'COMPLETED'].includes(order.status) && (
            <View style={{ gap: 8 }}>
              <Button
                mode="contained"
                icon="star"
                onPress={() => router.push(`/(app)/group-orders/rate?id=${order._id}` as never)}
                style={[styles.cancelBtn, { backgroundColor: '#F57F17' }]}
              >
                Rate Product & Supplier
              </Button>
              <Button
                mode="outlined"
                icon="alert-circle-outline"
                textColor="#C62828"
                onPress={() => router.push(`/(app)/group-orders/issue?id=${order._id}` as never)}
              >
                Report Delivery Issue (24h)
              </Button>
            </View>
          )}

        {}
        {role === 'supplier' && ['DELIVERED', 'COMPLETED'].includes(order.status) && (
          <Button
            mode="contained"
            icon="clipboard-alert"
            onPress={() =>
              router.push(`/(app)/group-orders/supplier-issues?id=${order._id}` as never)
            }
            style={[styles.cancelBtn, { backgroundColor: '#7B1FA2' }]}
          >
            Review Resident Issues
          </Button>
        )}

        {}
        {role === 'president' && ['DELIVERED', 'COMPLETED'].includes(order.status) && (
          <Button
            mode="contained"
            icon="cash-check"
            onPress={() =>
              router.push(`/(app)/group-orders/settlement?id=${order._id}` as never)
            }
            style={[styles.cancelBtn, { backgroundColor: '#1B5E20' }]}
          >
            Review Disputes & Settle Escrow
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#757575' },
  errorText: { color: '#F44336' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { borderRadius: 10 },
  statusChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  timer: { color: '#E65100', fontWeight: '500' },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  productName: { fontWeight: '700', color: '#212121', marginBottom: 2 },
  category: { color: '#757575' },
  description: { color: '#424242', lineHeight: 20 },
  divider: { marginVertical: 8 },
  sectionTitle: { fontWeight: '700', color: '#212121' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  boldText: { fontWeight: '700', color: '#212121' },
  mutedText: { color: '#757575' },
  progressBar: { height: 10, borderRadius: 5, marginBottom: 6 },
  pctText: { fontWeight: '600', fontSize: 13 },
  tierSection: { marginTop: 12 },
  tierTitle: { fontWeight: '600', color: '#212121', marginBottom: 6 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  tierActive: { backgroundColor: '#E8F5E9' },
  tierText: { color: '#757575' },
  tierActiveText: { color: '#2E7D32', fontWeight: '600' },
  myQtyText: { color: '#1565C0', fontWeight: '600', marginBottom: 8 },
  qtyInput: { backgroundColor: '#fff', marginTop: 4 },
  qtyError: { color: '#F44336', fontSize: 12, marginTop: 2 },
  demandActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  demandBtn: { flex: 1 },
  cancelBtn: { marginTop: 4 },
});
