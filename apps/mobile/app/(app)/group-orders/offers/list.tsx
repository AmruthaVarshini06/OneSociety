import React from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { listOffers, selectOffer, type SupplierOffer } from '../../../../src/services/offers';
import { getGroupOrder } from '../../../../src/services/group-orders';

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  '#FF9800',
  ACCEPTED: '#4CAF50',
  REJECTED: '#9E9E9E',
};

function lowestPrice(offer: SupplierOffer): number {
  if (!offer.tiers.length) return Infinity;
  return Math.min(...offer.tiers.map((t) => t.pricePerUnit));
}

function OfferCard({
  offer,
  unit,
  totalDemand,
  canSelect,
  onSelect,
  selecting,
}: {
  offer: SupplierOffer;
  unit: string;
  totalDemand: number;
  canSelect: boolean;
  onSelect: () => void;
  selecting: boolean;
}) {
  const supplier = typeof offer.supplierId === 'object' ? offer.supplierId : null;
  const statusColor = STATUS_COLORS[offer.status] ?? '#9E9E9E';

  const activeTier = [...offer.tiers]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .filter((t) => totalDemand >= t.minQuantity)
    .at(-1);

  return (
    <Card style={[styles.card, offer.status === 'ACCEPTED' && styles.acceptedCard]} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.flex1}>
            <Text variant="titleMedium" style={styles.businessName}>
              {supplier?.businessName ?? 'Supplier'}
            </Text>
            <Text variant="bodySmall" style={styles.mutedText}>
              {supplier?.contactName} · {supplier?.contactPhone}
            </Text>
          </View>
          <Chip compact style={[styles.statusChip, { backgroundColor: statusColor }]} textStyle={styles.chipText}>
            {offer.status}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {}
        {activeTier && (
          <View style={styles.highlightRow}>
            <Text variant="bodySmall" style={styles.highlightLabel}>
              Price at {totalDemand} {unit}:
            </Text>
            <Text variant="titleMedium" style={styles.highlightPrice}>
              {formatPaise(activeTier.pricePerUnit)} / {unit}
            </Text>
          </View>
        )}

        {}
        <Text variant="labelSmall" style={styles.tierHeading}>All Tiers</Text>
        {offer.tiers.map((t, i) => {
          const isActive = t === activeTier;
          return (
            <View key={i} style={[styles.tierRow, isActive && styles.tierActive]}>
              <Text variant="bodySmall" style={isActive ? styles.tierTextActive : styles.tierText}>
                {t.minQuantity}+ {unit}
              </Text>
              <Text variant="bodySmall" style={isActive ? styles.tierTextActive : styles.tierText}>
                {formatPaise(t.pricePerUnit)}
              </Text>
            </View>
          );
        })}

        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={styles.mutedText}>
            🚚 {offer.deliveryDays} day{offer.deliveryDays !== 1 ? 's' : ''} delivery
          </Text>
          {offer.note && (
            <Text variant="bodySmall" style={styles.noteText} numberOfLines={2}>
              💬 {offer.note}
            </Text>
          )}
        </View>
      </Card.Content>

      {canSelect && offer.status === 'PENDING' && (
        <Card.Actions>
          <Button
            mode="contained"
            onPress={onSelect}
            loading={selecting}
            disabled={selecting}
            style={styles.selectBtn}
          >
            Select This Supplier
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
}

export default function OffersListScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const { data: orderData } = useQuery({
    queryKey: ['group-order', orderId],
    queryFn: () => getGroupOrder(orderId),
    enabled: !!orderId,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['offers', orderId],
    queryFn: () => listOffers(orderId),
    enabled: !!orderId,
  });

  const selectMutation = useMutation({
    mutationFn: (offerId: string) => selectOffer(orderId, offerId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['offers', orderId] });
      queryClient.invalidateQueries({ queryKey: ['group-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['group-orders'] });
      Alert.alert('Supplier Selected', result.message);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to select supplier.';
      Alert.alert('Error', msg);
    },
  });

  const handleSelect = (offer: SupplierOffer) => {
    const supplier = typeof offer.supplierId === 'object' ? offer.supplierId : null;
    Alert.alert(
      'Confirm Selection',
      `Select ${supplier?.businessName ?? 'this supplier'} for this order? All other offers will be rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: () => selectMutation.mutate(offer._id),
        },
      ],
    );
  };

  const order = orderData?.order;
  const unit = order?.unit ?? 'unit';
  const totalDemand = order?.totalDemandedQuantity ?? 0;
  const canSelect = order?.status === 'OFFERS_OPEN';

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load offers.</Text>
        <Button onPress={() => refetch()} style={{ marginTop: 12 }}>Retry</Button>
      </View>
    );
  }

  const offers = data?.offers ?? [];

  const sorted = [...offers].sort((a, b) => {
    if (a.status !== b.status) {
      const order = ['PENDING', 'ACCEPTED', 'REJECTED'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    }
    return lowestPrice(a) - lowestPrice(b);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Text variant="titleSmall" style={styles.headerText}>
          {offers.length} offer{offers.length !== 1 ? 's' : ''} · Total demand: {totalDemand} {unit}
        </Text>
      </View>

      {offers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No offers yet. Suppliers will submit once demand window closes.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(o) => o._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              unit={unit}
              totalDemand={totalDemand}
              canSelect={canSelect}
              onSelect={() => handleSelect(item)}
              selecting={selectMutation.isPending}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerText: { color: '#757575' },
  list: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#F44336' },
  emptyText: { color: '#9E9E9E', textAlign: 'center' },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  acceptedCard: { borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  flex1: { flex: 1 },
  businessName: { fontWeight: '700', color: '#212121' },
  mutedText: { color: '#757575', marginTop: 2 },
  statusChip: { borderRadius: 8 },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  divider: { marginVertical: 8 },
  highlightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  highlightLabel: { color: '#757575' },
  highlightPrice: { color: '#1B5E20', fontWeight: '800' },
  tierHeading: { color: '#9E9E9E', marginBottom: 4 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4 },
  tierActive: { backgroundColor: '#E8F5E9' },
  tierText: { color: '#757575' },
  tierTextActive: { color: '#2E7D32', fontWeight: '600' },
  metaRow: { marginTop: 8, gap: 4 },
  noteText: { color: '#546E7A' },
  selectBtn: { flex: 1 },
});
