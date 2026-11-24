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
  TextInput,
  Dialog,
  Portal,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPendingReviews,
  reviewRentalItem,
  type RentalItem,
} from '../../../../src/services/rentals';

export default function PresidentRentalReviewsScreen() {
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pending-rental-reviews'],
    queryFn: listPendingReviews,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: 'APPROVE' | 'REJECT';
      reason: string;
    }) => reviewRentalItem(id, decision, reason),
    onSuccess: (_, vars) => {
      setSelectedItem(null);
      setDecision(null);
      setReviewReason('');
      queryClient.invalidateQueries({ queryKey: ['pending-rental-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['rentals-items'] });
      Alert.alert(
        vars.decision === 'APPROVE' ? 'Item Approved' : 'Item Rejected',
        `Listing has been ${vars.decision === 'APPROVE' ? 'published' : 'rejected'}. Owner notified.`,
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Review action failed';
      Alert.alert('Error', msg);
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text variant="titleMedium" style={styles.topTitle}>
          Price Review Queue
        </Text>
        <Text variant="bodySmall" style={styles.topSubtitle}>
          Review listings where owners appealed AI pricing verdicts
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const ownerName =
            typeof item.ownerId === 'object' && item.ownerId ? item.ownerId.username : 'Resident';
          const flatNumber =
            typeof item.flatId === 'object' && item.flatId ? item.flatId.number : item.pickupLocation;

          return (
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.itemTitle}>
                      {item.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.subText}>
                      Owner: {ownerName} • Flat {flatNumber} • Category: {item.category}
                    </Text>
                  </View>
                  <Chip compact style={{ backgroundColor: '#FFF3E0' }}>
                    PENDING APPROVAL
                  </Chip>
                </View>

                {}
                <View style={styles.reasonBox}>
                  <Text variant="labelSmall" style={{ fontWeight: '700', color: '#E65100' }}>
                    Owner Appeal Reason:
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#BF360C', marginTop: 2 }}>
                    {item.aiPriceVerification?.reason || 'No specific reason entered.'}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {}
                <View style={styles.ratesComparison}>
                  <View style={styles.compBox}>
                    <Text variant="labelSmall" style={styles.compLabel}>
                      Owner Requested
                    </Text>
                    {item.chargeHourlyPaise ? (
                      <Text variant="bodySmall">
                        Hourly: ₹{(item.chargeHourlyPaise / 100).toFixed(0)}
                      </Text>
                    ) : null}
                    {item.chargeDailyPaise ? (
                      <Text variant="bodySmall">
                        Daily: ₹{(item.chargeDailyPaise / 100).toFixed(0)}
                      </Text>
                    ) : null}
                    <Text variant="bodySmall">
                      Deposit: ₹{(item.safeDepositPaise / 100).toFixed(0)}
                    </Text>
                  </View>

                  <View style={[styles.compBox, styles.aiBox]}>
                    <Text variant="labelSmall" style={styles.compLabel}>
                      AI Suggested
                    </Text>
                    {item.aiPriceVerification?.suggestedHourlyRangePaise && (
                      <Text variant="bodySmall">
                        Hourly: ₹
                        {(item.aiPriceVerification.suggestedHourlyRangePaise.min / 100).toFixed(0)} - ₹
                        {(item.aiPriceVerification.suggestedHourlyRangePaise.max / 100).toFixed(0)}
                      </Text>
                    )}
                    {item.aiPriceVerification?.suggestedDailyRangePaise && (
                      <Text variant="bodySmall">
                        Daily: ₹
                        {(item.aiPriceVerification.suggestedDailyRangePaise.min / 100).toFixed(0)} - ₹
                        {(item.aiPriceVerification.suggestedDailyRangePaise.max / 100).toFixed(0)}
                      </Text>
                    )}
                    {item.aiPriceVerification?.suggestedDepositRangePaise && (
                      <Text variant="bodySmall">
                        Deposit: ₹
                        {(item.aiPriceVerification.suggestedDepositRangePaise.min / 100).toFixed(0)} - ₹
                        {(item.aiPriceVerification.suggestedDepositRangePaise.max / 100).toFixed(0)}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>

              <Card.Actions style={styles.cardActions}>
                <Button
                  mode="outlined"
                  textColor="#D32F2F"
                  onPress={() => {
                    setSelectedItem(item);
                    setDecision('REJECT');
                    setReviewReason('Price significantly higher than fair market threshold.');
                  }}
                >
                  Reject
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  onPress={() => {
                    setSelectedItem(item);
                    setDecision('APPROVE');
                    setReviewReason('Price verified and accepted for society sharing.');
                  }}
                >
                  Approve & Publish
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
              <Text variant="titleMedium" style={{ color: '#757575' }}>
                No pending price reviews
              </Text>
              <Text variant="bodySmall" style={{ color: '#BDBDBD', marginTop: 4 }}>
                All item listings in your society are currently verified or settled.
              </Text>
            </View>
          )
        }
      />

      {}
      <Portal>
        <Dialog
          visible={!!selectedItem && !!decision}
          onDismiss={() => {
            setSelectedItem(null);
            setDecision(null);
          }}
        >
          <Dialog.Title>
            {decision === 'APPROVE' ? 'Approve Item Listing' : 'Reject Item Listing'}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 8 }}>
              {decision === 'APPROVE'
                ? `Publish "${selectedItem?.name}" to society catalog with approved pricing?`
                : `Reject listing for "${selectedItem?.name}"?`}
            </Text>
            <TextInput
              label="Review Note / Feedback"
              value={reviewReason}
              onChangeText={setReviewReason}
              multiline
              numberOfLines={2}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setSelectedItem(null);
                setDecision(null);
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={decision === 'APPROVE' ? '#2E7D32' : '#D32F2F'}
              loading={reviewMutation.isPending}
              disabled={!reviewReason.trim() || reviewMutation.isPending}
              onPress={() => {
                if (selectedItem && decision) {
                  reviewMutation.mutate({
                    id: selectedItem._id,
                    decision,
                    reason: reviewReason.trim(),
                  });
                }
              }}
            >
              Confirm {decision === 'APPROVE' ? 'Approval' : 'Rejection'}
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  topTitle: { fontWeight: '700', color: '#1565C0' },
  topSubtitle: { color: '#757575', marginTop: 2 },
  listContent: { padding: 16, gap: 12 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: { fontWeight: '700', color: '#212121' },
  subText: { color: '#757575', marginTop: 2 },
  reasonBox: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  ratesComparison: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  compBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
  },
  aiBox: {
    backgroundColor: '#E8F5E9',
  },
  compLabel: {
    fontWeight: '700',
    color: '#424242',
    marginBottom: 4,
  },
  cardActions: {
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
});
