import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { getMyOffer } from '../../../../src/services/offers';
import { getGroupOrder } from '../../../../src/services/group-orders';

const STATUS_COLORS: Record<string, string> = {
  PENDING:  '#FF9800',
  ACCEPTED: '#4CAF50',
  REJECTED: '#F44336',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING:  'Under Review',
  ACCEPTED: 'Accepted ✅',
  REJECTED: 'Rejected',
};

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function MyOfferScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { data: orderData } = useQuery({
    queryKey: ['group-order', orderId],
    queryFn: () => getGroupOrder(orderId),
    enabled: !!orderId,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-offer', orderId],
    queryFn: () => getMyOffer(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load offer.</Text>
        <Button onPress={() => refetch()} style={{ marginTop: 12 }}>Retry</Button>
      </View>
    );
  }

  const unit = orderData?.order.unit ?? 'unit';

  if (!data?.offer) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          You haven't submitted an offer yet.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.push(`/(app)/group-orders/offers/submit?orderId=${orderId}` as never)}
          style={{ marginTop: 16 }}
        >
          Submit Offer
        </Button>
      </View>
    );
  }

  const { offer } = data;
  const statusColor = STATUS_COLORS[offer.status] ?? '#9E9E9E';
  const statusLabel = STATUS_LABELS[offer.status] ?? offer.status;
  const canEdit = offer.status === 'PENDING' && orderData?.order.status === 'OFFERS_OPEN';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusColor }]}
            textStyle={styles.statusChipText}
          >
            {statusLabel}
          </Chip>
          {canEdit && (
            <Button
              compact
              mode="outlined"
              onPress={() =>
                router.push(`/(app)/group-orders/offers/submit?orderId=${orderId}` as never)
              }
            >
              Edit Offer
            </Button>
          )}
        </View>

        {/* Tiers */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Price Tiers</Text>
            <Divider style={styles.divider} />
            {offer.tiers.map((tier, i) => (
              <View key={i} style={styles.tierRow}>
                <Text variant="bodyMedium" style={styles.tierQty}>
                  {tier.minQuantity}+ {unit}
                </Text>
                <Text variant="bodyMedium" style={styles.tierPrice}>
                  {formatPaise(tier.pricePerUnit)} / {unit}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Details */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Details</Text>
            <Divider style={styles.divider} />
            <InfoRow label="Delivery estimate" value={`${offer.deliveryDays} day(s) after confirmation`} />
            {offer.note && <InfoRow label="Note" value={offer.note} />}
            <InfoRow
              label="Submitted"
              value={new Date(offer.createdAt).toLocaleString('en-IN')}
            />
            {offer.updatedAt !== offer.createdAt && (
              <InfoRow
                label="Last updated"
                value={new Date(offer.updatedAt).toLocaleString('en-IN')}
              />
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>{label}</Text>
      <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#F44336' },
  emptyText: { color: '#9E9E9E', textAlign: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { borderRadius: 10 },
  statusChipText: { color: '#fff', fontWeight: '700' },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  sectionTitle: { fontWeight: '700', color: '#212121' },
  divider: { marginVertical: 8 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tierQty: { color: '#424242' },
  tierPrice: { color: '#7B1FA2', fontWeight: '600' },
  infoRow: { paddingVertical: 6 },
  infoLabel: { color: '#9E9E9E', marginBottom: 2 },
  infoValue: { color: '#212121' },
});
