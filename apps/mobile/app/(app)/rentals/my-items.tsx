import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Switch,
  IconButton,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyRentalItems,
  toggleItemAvailability,
  deleteRentalItem,
  escalateRentalItem,
  type RentalItem,
} from '../../../src/services/rentals';

export default function MyRentalItemsScreen() {
  const queryClient = useQueryClient();

  const [escalateItem, setEscalateItem] = useState<RentalItem | null>(null);
  const [escalateReason, setEscalateReason] = useState('');

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-rentals'],
    queryFn: getMyRentalItems,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      toggleItemAvailability(id, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-items'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRentalItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-items'] });
      Alert.alert('Deleted', 'Item removed from listings.');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      escalateRentalItem(id, reason),
    onSuccess: () => {
      setEscalateItem(null);
      setEscalateReason('');
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
      Alert.alert('Submitted', 'Sent to President for manual review.');
    },
  });

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'DRAFT':
        return { bg: '#FFF8E1', text: '#F57F17' };
      case 'PENDING_APPROVAL':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'REJECTED':
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#EEEEEE', text: '#616161' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <View>
          <Text variant="titleMedium" style={styles.topTitle}>
            My Rental Catalog
          </Text>
          <Text variant="bodySmall" style={styles.topSubtitle}>
            Manage your items, toggle availability, and check AI pricing status
          </Text>
        </View>
        <Button
          mode="contained"
          icon="plus"
          compact
          onPress={() => router.push('/(app)/rentals/create' as never)}
        >
          Add Item
        </Button>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusStyle = getStatusChipStyle(item.status);

          return (
            <Card
              style={styles.card}
              mode="elevated"
              onPress={() => router.push(`/(app)/rentals/${item._id}` as never)}
            >
              <Card.Content>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.itemTitle}>
                      {item.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.categoryLabel}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>

                  <Chip
                    compact
                    style={{ backgroundColor: statusStyle.bg }}
                    textStyle={{ color: statusStyle.text, fontWeight: '700', fontSize: 11 }}
                  >
                    {item.status}
                  </Chip>
                </View>

                {/* AI Status / Reason */}
                {item.aiPriceVerification && (
                  <View style={styles.aiNote}>
                    <Text variant="bodySmall" style={{ color: '#424242' }}>
                      <Text style={{ fontWeight: '700' }}>AI Check: </Text>
                      {item.aiPriceVerification.reason}
                    </Text>
                  </View>
                )}

                {/* Rates */}
                <View style={styles.ratesRow}>
                  {item.chargeHourlyPaise ? (
                    <Text variant="bodySmall" style={styles.rateText}>
                      Hourly: ₹{(item.chargeHourlyPaise / 100).toFixed(0)}
                    </Text>
                  ) : null}
                  {item.chargeDailyPaise ? (
                    <Text variant="bodySmall" style={styles.rateText}>
                      Daily: ₹{(item.chargeDailyPaise / 100).toFixed(0)}
                    </Text>
                  ) : null}
                  <Text variant="bodySmall" style={styles.depositText}>
                    Deposit: ₹{(item.safeDepositPaise / 100).toFixed(0)}
                  </Text>
                </View>

                {/* Availability Toggle */}
                <View style={styles.toggleRow}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                    {item.isAvailable ? 'Available for Rent' : 'Marked Unavailable / Paused'}
                  </Text>
                  <Switch
                    value={item.isAvailable}
                    onValueChange={(val) =>
                      toggleMutation.mutate({ id: item._id, isAvailable: val })
                    }
                  />
                </View>

                {/* Draft Actions */}
                {item.status === 'DRAFT' && (
                  <Button
                    mode="contained-tonal"
                    icon="shield-alert"
                    compact
                    onPress={() => setEscalateItem(item)}
                    style={{ marginTop: 8 }}
                  >
                    Escalate to President for Review
                  </Button>
                )}
              </Card.Content>

              <Card.Actions>
                <Button
                  textColor="#D32F2F"
                  icon="delete-outline"
                  onPress={() => {
                    Alert.alert('Delete', `Remove "${item.name}" from your listings?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteMutation.mutate(item._id),
                      },
                    ]);
                  }}
                >
                  Delete
                </Button>
                <Button
                  mode="text"
                  onPress={() => router.push(`/(app)/rentals/${item._id}` as never)}
                >
                  View Details
                </Button>
              </Card.Actions>
            </Card>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} />
          ) : (
            <View style={styles.empty}>
              <IconButton icon="package-variant" size={48} iconColor="#BDBDBD" />
              <Text variant="titleMedium" style={{ color: '#757575' }}>
                You haven't listed any items yet
              </Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => router.push('/(app)/rentals/create' as never)}
                style={{ marginTop: 12 }}
              >
                List Your First Item
              </Button>
            </View>
          )
        }
      />

      {/* Escalate Dialog */}
      <Portal>
        <Dialog
          visible={!!escalateItem}
          onDismiss={() => {
            setEscalateItem(null);
            setEscalateReason('');
          }}
        >
          <Dialog.Title>Escalate Listing</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 8 }}>
              Request manual approval from the Society President for "{escalateItem?.name}".
            </Text>
            <TextInput
              label="Why is this pricing fair?"
              value={escalateReason}
              onChangeText={setEscalateReason}
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setEscalateItem(null);
                setEscalateReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={escalateMutation.isPending}
              disabled={!escalateReason.trim() || escalateMutation.isPending}
              onPress={() => {
                if (escalateItem) {
                  escalateMutation.mutate({
                    id: escalateItem._id,
                    reason: escalateReason.trim(),
                  });
                }
              }}
            >
              Submit
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  topTitle: { fontWeight: '700', color: '#1565C0' },
  topSubtitle: { color: '#757575', maxWidth: 220 },
  listContent: { padding: 16, gap: 12 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: { fontWeight: '700', color: '#212121' },
  categoryLabel: { color: '#757575', marginTop: 2 },
  aiNote: {
    backgroundColor: '#FFFDE7',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  ratesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingVertical: 4,
  },
  rateText: { color: '#1565C0', fontWeight: '600' },
  depositText: { color: '#2E7D32', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
});
