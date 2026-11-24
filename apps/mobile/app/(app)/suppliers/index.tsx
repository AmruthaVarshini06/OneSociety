import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Chip,
  Card,
  ActivityIndicator,
  Divider,
  Badge,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listSuppliers, type Supplier } from '../../../src/services/suppliers';

type StatusFilter = 'ALL' | 'PENDING_REVIEW' | 'GST_VERIFIED' | 'APPROVED' | 'REJECTED';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'PENDING_REVIEW', 'GST_VERIFIED', 'APPROVED', 'REJECTED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: '#FF9800',
  GST_VERIFIED: '#2196F3',
  APPROVED: '#4CAF50',
  REJECTED: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending',
  GST_VERIFIED: 'GST ✓',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const color = STATUS_COLORS[supplier.verificationStatus] ?? '#9E9E9E';
  const label = STATUS_LABELS[supplier.verificationStatus] ?? supplier.verificationStatus;

  return (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => router.push(`/(app)/suppliers/${supplier._id}` as never)}
    >
      <Card.Content>
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={styles.businessName}>
              {supplier.businessName}
            </Text>
            <Text variant="bodySmall" style={styles.contactText}>
              {supplier.contactName} · {supplier.contactPhone}
            </Text>
            {supplier.gstNumber ? (
              <Text variant="bodySmall" style={styles.gstText}>
                GST: {supplier.gstNumber}
              </Text>
            ) : null}
          </View>
          <Badge
            style={[styles.badge, { backgroundColor: color }]}
            size={24}
          >
            {label}
          </Badge>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function SuppliersListScreen() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['suppliers', activeFilter],
    queryFn: () =>
      listSuppliers(activeFilter !== 'ALL' ? { status: activeFilter } : undefined),
  });

  const onFilterPress = useCallback((f: StatusFilter) => {
    setActiveFilter(f);
  }, []);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          No suppliers found
        </Text>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.center}>
      <Text variant="bodyLarge" style={styles.errorText}>
        Failed to load suppliers. Pull to retry.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Chip
              selected={activeFilter === item}
              onPress={() => onFilterPress(item)}
              style={styles.filterChip}
              compact
            >
              {item === 'ALL' ? 'All' : (STATUS_LABELS[item] ?? item)}
            </Chip>
          )}
        />
      </View>

      <Divider />

      {}
      <View style={styles.headerRow}>
        <Text variant="titleSmall" style={styles.countText}>
          {data?.total !== undefined ? `${data.total} supplier${data.total !== 1 ? 's' : ''}` : ''}
        </Text>
        <Text
          variant="labelLarge"
          style={styles.addLink}
          onPress={() => router.push('/(app)/suppliers/create' as never)}
        >
          + Add Supplier
        </Text>
      </View>

      {}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading suppliers…</Text>
        </View>
      )}

      {}
      {isError && !isLoading && renderError()}

      {}
      {!isLoading && !isError && (
        <FlatList
          data={data?.suppliers ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <SupplierCard supplier={item} />}
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
  filterRow: { paddingVertical: 8, backgroundColor: '#fff' },
  filterList: { paddingHorizontal: 12, gap: 8 },
  filterChip: { marginRight: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  countText: { color: '#757575' },
  addLink: { color: '#1565C0' },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  businessName: { fontWeight: '600', color: '#212121' },
  contactText: { color: '#757575', marginTop: 2 },
  gstText: { color: '#546E7A', marginTop: 2, fontFamily: 'monospace' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#9E9E9E', textAlign: 'center' },
  errorText: { color: '#F44336', textAlign: 'center' },
  loadingText: { marginTop: 12, color: '#757575' },
});
