import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  IconButton,
  Searchbar,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/auth';
import {
  listItemRequests,
  getMyItemRequests,
  dismissItemRequest,
  cancelItemRequest,
  type ItemRequest,
} from '../../../../src/services/rental-requests';

type ViewMode = 'society' | 'mine';

function formatNeededFrom(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function RequestCard({
  item,
  isOwn,
  onDismiss,
  onCancel,
}: {
  item: ItemRequest;
  isOwn: boolean;
  onDismiss?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const flatNumber =
    typeof item.flatId === 'object' && item.flatId ? item.flatId.number : '—';
  const requesterName =
    typeof item.requesterId === 'object' && item.requesterId
      ? item.requesterId.username
      : 'Neighbour';

  const statusColors: Record<string, string> = {
    OPEN: '#E3F2FD',
    FULFILLED: '#E8F5E9',
    CANCELLED: '#FFEBEE',
    EXPIRED: '#F5F5F5',
  };

  return (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => router.push(`/(app)/rentals/requests/${item._id}` as never)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.itemTitle}>
              {item.itemName}
            </Text>
            <Text variant="bodySmall" style={styles.subText}>
              {isOwn ? 'My Request' : `Flat ${flatNumber} · ${requesterName}`} · {item.category.toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardBadges}>
            <Chip
              compact
              style={{ backgroundColor: statusColors[item.status] ?? '#F5F5F5' }}
              textStyle={{ fontSize: 10, fontWeight: '700' }}
            >
              {item.status}
            </Chip>
            {item.offersCount > 0 && (
              <Chip compact icon="tag-multiple" style={{ backgroundColor: '#FFF3E0' }}>
                {item.offersCount} offer{item.offersCount !== 1 ? 's' : ''}
              </Chip>
            )}
          </View>
        </View>

        {item.purpose ? (
          <Text variant="bodySmall" style={styles.purposeText} numberOfLines={2}>
            For: {item.purpose}
          </Text>
        ) : null}

        <View style={styles.detailRow}>
          <Chip compact icon="clock-outline" style={styles.detailChip}>
            {item.durationValue} {item.durationType.toLowerCase()}
          </Chip>
          <Chip compact icon="calendar" style={styles.detailChip}>
            From {formatNeededFrom(item.neededFrom)}
          </Chip>
          {item.budgetPaise ? (
            <Chip compact icon="currency-inr" style={styles.detailChip}>
              Budget ₹{(item.budgetPaise / 100).toFixed(0)}
            </Chip>
          ) : null}
        </View>
      </Card.Content>

      {item.status === 'OPEN' && (
        <Card.Actions style={styles.cardActions}>
          {isOwn ? (
            <Button
              textColor="#D32F2F"
              compact
              onPress={() => onCancel?.(item._id)}
            >
              Cancel Request
            </Button>
          ) : (
            <>
              <Button
                mode="text"
                compact
                icon="eye-off"
                onPress={() => onDismiss?.(item._id)}
              >
                Not Available
              </Button>
              <Button
                mode="contained"
                compact
                icon="handshake"
                onPress={() => router.push(`/(app)/rentals/requests/${item._id}` as never)}
              >
                I Have It
              </Button>
            </>
          )}
        </Card.Actions>
      )}
    </Card>
  );
}

export default function ItemRequestsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('society');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: societyData,
    isLoading: societyLoading,
    refetch: refetchSociety,
    isRefetching: societyRefetching,
  } = useQuery({
    queryKey: ['item-requests-society'],
    queryFn: () => listItemRequests({ status: 'OPEN' }),
    enabled: viewMode === 'society',
  });

  const {
    data: myRequests = [],
    isLoading: myLoading,
    refetch: refetchMine,
    isRefetching: mineRefetching,
  } = useQuery({
    queryKey: ['item-requests-mine'],
    queryFn: getMyItemRequests,
    enabled: viewMode === 'mine',
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissItemRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-requests-society'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelItemRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-requests-mine'] });
      queryClient.invalidateQueries({ queryKey: ['item-requests-society'] });
    },
  });

  const displayItems: ItemRequest[] =
    viewMode === 'society'
      ? (societyData?.requests ?? []).filter((r) =>
          searchQuery.trim()
            ? r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.category.toLowerCase().includes(searchQuery.toLowerCase())
            : true,
        )
      : myRequests.filter((r) =>
          searchQuery.trim()
            ? r.itemName.toLowerCase().includes(searchQuery.toLowerCase())
            : true,
        );

  const isLoading = viewMode === 'society' ? societyLoading : myLoading;
  const isRefetching = viewMode === 'society' ? societyRefetching : mineRefetching;
  const onRefresh = viewMode === 'society' ? refetchSociety : refetchMine;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.headerTitle}>
              Community Wanted Board
            </Text>
            <Text variant="bodySmall" style={styles.headerSub}>
              Neighbours looking to borrow items in society
            </Text>
          </View>
          <Button
            mode="contained"
            icon="plus"
            compact
            onPress={() => router.push('/(app)/rentals/requests/create' as never)}
          >
            Request Item
          </Button>
        </View>

        <SegmentedButtons
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          buttons={[
            { value: 'society', label: 'Society Requests' },
            { value: 'mine', label: 'My Requests' },
          ]}
          style={{ marginTop: 10 }}
        />

        <Searchbar
          placeholder="Search item or category..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={{ minHeight: 40 }}
        />
      </View>

      <FlatList
        data={displayItems}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            isOwn={viewMode === 'mine'}
            onDismiss={(id) => dismissMutation.mutate(id)}
            onCancel={(id) =>
              Alert.alert('Cancel Request', `Cancel your request for "${item.itemName}"?`, [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
              ])
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} />
          ) : (
            <View style={styles.empty}>
              <IconButton icon="magnify" size={48} iconColor="#BDBDBD" />
              <Text variant="titleMedium" style={{ color: '#757575' }}>
                {viewMode === 'society'
                  ? 'No open requests in the society right now'
                  : "You haven't made any requests yet"}
              </Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => router.push('/(app)/rentals/requests/create' as never)}
                style={{ marginTop: 12 }}
              >
                Request an Item
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { fontWeight: '700', color: '#1565C0' },
  headerSub: { color: '#757575', marginTop: 1 },
  searchbar: {
    marginTop: 10,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    height: 44,
  },
  listContent: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardBadges: { gap: 4, alignItems: 'flex-end' },
  itemTitle: { fontWeight: '700', color: '#212121' },
  subText: { color: '#757575', marginTop: 2 },
  purposeText: { color: '#616161', marginTop: 6, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  detailChip: { backgroundColor: '#F5F5F5' },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 10, paddingBottom: 8 },
  empty: { alignItems: 'center', padding: 32 },
});
