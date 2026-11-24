import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Chip,
  Card,
  ActivityIndicator,
  ProgressBar,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { listGroupOrders, type GroupOrder } from '../../../src/services/group-orders';

type StatusFilter = 'ALL' | 'DEMAND_OPEN' | 'OFFERS_OPEN' | 'COMPLETED' | 'CANCELLED';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'DEMAND_OPEN', 'OFFERS_OPEN', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  DEMAND_OPEN: '#1565C0',
  OFFERS_OPEN: '#7B1FA2',
  SUPPLIER_SELECTED: '#E65100',
  GROUP_ORDER_OPEN: '#1B5E20',
  PAYMENT_WINDOW: '#F57F17',
  DELIVERY_PENDING: '#00695C',
  DELIVERED: '#2E7D32',
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
  if (diff <= 0) return 'Closed';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function OrderCard({ order }: { order: GroupOrder }) {
  const color = STATUS_COLORS[order.status] ?? '#9E9E9E';
  const label = STATUS_LABELS[order.status] ?? order.status;
  const progress = Math.min(order.totalDemandedQuantity / order.minimumQuantity, 1);
  const pct = Math.round(progress * 100);

  return (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => router.push(`/(app)/group-orders/${order._id}` as never)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text variant="titleMedium" style={styles.productName} numberOfLines={1}>
              {order.productName}
            </Text>
            <Text variant="bodySmall" style={styles.category}>
              {order.productCategory}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: color }]}
            textStyle={styles.statusChipText}
          >
            {label}
          </Chip>
        </View>

        {}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text variant="bodySmall" style={styles.progressLabel}>
              {order.totalDemandedQuantity} / {order.minimumQuantity} {order.unit}
            </Text>
            <Text variant="bodySmall" style={[styles.progressLabel, { color }]}>
              {pct}%
            </Text>
          </View>
          <ProgressBar
            progress={progress}
            color={progress >= 1 ? '#4CAF50' : color}
            style={styles.progressBar}
          />
        </View>

        {order.status === 'DEMAND_OPEN' && (
          <Text variant="bodySmall" style={styles.deadline}>
            ⏱ {timeLeft(order.demandCloseAt)}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

export default function GroupOrdersListScreen() {
  const { user } = useAuthStore();
  const role = user?.role;
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['group-orders', activeFilter],
    queryFn: () =>
      listGroupOrders(activeFilter !== 'ALL' ? { status: activeFilter } : undefined),
    refetchInterval: 30_000,
  });

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No group orders found</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <Chip
            selected={activeFilter === item}
            onPress={() => setActiveFilter(item)}
            compact
            style={styles.filterChip}
          >
            {item === 'ALL' ? 'All' : (STATUS_LABELS[item] ?? item)}
          </Chip>
        )}
      />

      {}
      {role === 'president' && (
        <View style={styles.addRow}>
          <Button
            mode="contained"
            compact
            onPress={() => router.push('/(app)/group-orders/create' as never)}
            icon="plus"
          >
            Open Demand Window
          </Button>
        </View>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load. Pull to retry.</Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(i) => i._id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterList: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: { marginRight: 4 },
  addRow: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitleWrap: { flex: 1, marginRight: 8 },
  productName: { fontWeight: '700', color: '#212121' },
  category: { color: '#757575', marginTop: 2 },
  statusChip: { borderRadius: 10 },
  statusChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  progressSection: { marginBottom: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { color: '#757575', fontSize: 12 },
  progressBar: { height: 6, borderRadius: 3 },
  deadline: { color: '#E65100', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#9E9E9E', textAlign: 'center' },
  errorText: { color: '#F44336', textAlign: 'center' },
  loadingText: { marginTop: 12, color: '#757575' },
});
