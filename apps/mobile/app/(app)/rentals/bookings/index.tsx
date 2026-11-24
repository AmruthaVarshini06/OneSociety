import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listBookings, type RentalBooking } from '../../../../src/services/rental-bookings';

type RoleFilter = 'all' | 'renter' | 'owner';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  REQUESTED: { bg: '#E3F2FD', text: '#1565C0' },
  ACCEPTED: { bg: '#E8EAF6', text: '#283593' },
  DECLINED: { bg: '#FFEBEE', text: '#C62828' },
  CANCELLED: { bg: '#F5F5F5', text: '#757575' },
  PAID_IN_ESCROW: { bg: '#FFF8E1', text: '#E65100' },
  PICKUP_PENDING: { bg: '#FFF9C4', text: '#F57F17' },
  IN_USE: { bg: '#E8F5E9', text: '#1B5E20' },
  RETURN_PENDING: { bg: '#FFF3E0', text: '#E65100' },
  RETURNED: { bg: '#F3E5F5', text: '#6A1B9A' },
  SETTLED: { bg: '#E8F5E9', text: '#2E7D32' },
  IN_DISPUTE: { bg: '#FFEBEE', text: '#B71C1C' },
  OVERDUE: { bg: '#FF8A65', text: '#BF360C' },
  EXPIRED: { bg: '#F5F5F5', text: '#9E9E9E' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BookingCard({ booking }: { booking: RentalBooking }) {
  const item = typeof booking.itemId === 'object' && booking.itemId ? booking.itemId : null;
  const renter = typeof booking.renterId === 'object' && booking.renterId ? booking.renterId : null;
  const owner = typeof booking.ownerId === 'object' && booking.ownerId ? booking.ownerId : null;
  const statusStyle = STATUS_COLORS[booking.status] ?? { bg: '#F5F5F5', text: '#616161' };

  return (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => router.push(`/(app)/rentals/bookings/${booking._id}` as never)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.itemTitle}>
              {item?.name ?? 'Rental Item'}
            </Text>
            <Text variant="bodySmall" style={styles.subText}>
              {item?.category?.toUpperCase()} · {booking.bookedUnits}{' '}
              {booking.billingUnit === 'HOUR'
                ? `hr${booking.bookedUnits > 1 ? 's' : ''}`
                : `day${booking.bookedUnits > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Chip
            compact
            style={{ backgroundColor: statusStyle.bg }}
            textStyle={{ color: statusStyle.text, fontWeight: '700', fontSize: 10 }}
          >
            {booking.status.replace('_', ' ')}
          </Chip>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodySmall" style={styles.detailText}>
            📅 Starts {formatDate(booking.startAt)}
          </Text>
          <Text variant="bodySmall" style={styles.detailText}>
            {renter ? `Renter: ${renter.username}` : owner ? `Owner: ${owner.username}` : ''}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Chip compact icon="cash" style={{ backgroundColor: '#E3F2FD' }}>
            Charge ₹{(booking.chargeCalculation.chargePaise / 100).toFixed(0)}
          </Chip>
          <Chip compact icon="shield-check" style={{ backgroundColor: '#E8F5E9' }}>
            Deposit ₹{(booking.chargeCalculation.depositPaise / 100).toFixed(0)}
          </Chip>
          <Chip compact style={{ backgroundColor: '#EDE7F6' }}>
            Total ₹{(booking.chargeCalculation.totalPaise / 100).toFixed(0)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function BookingsDashboardScreen() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', roleFilter],
    queryFn: () => listBookings({ role: roleFilter }),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>My Bookings</Text>
        <SegmentedButtons
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'renter', label: "I'm Renting" },
            { value: 'owner', label: "I'm Lending" },
          ]}
          style={{ marginTop: 10 }}
        />
      </View>

      <FlatList
        data={data?.bookings ?? []}
        keyExtractor={(b) => b._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <BookingCard booking={item} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} />
          ) : (
            <View style={styles.empty}>
              <Text variant="titleMedium" style={{ color: '#757575' }}>
                No bookings found
              </Text>
              <Text variant="bodySmall" style={{ color: '#BDBDBD', marginTop: 4 }}>
                Browse items in the Share & Rent catalog to book your first rental.
              </Text>
              <Button
                mode="contained"
                icon="magnify"
                onPress={() => router.push('/(app)/rentals' as never)}
                style={{ marginTop: 12 }}
              >
                Browse Items
              </Button>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontWeight: '700', color: '#1565C0' },
  list: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemTitle: { fontWeight: '700', color: '#212121' },
  subText: { color: '#757575', marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  detailText: { color: '#616161' },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  empty: { alignItems: 'center', padding: 32 },
});
