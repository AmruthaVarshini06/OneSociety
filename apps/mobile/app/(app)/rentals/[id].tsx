import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Divider,
  Switch,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/auth';
import {
  getRentalItem,
  toggleItemAvailability,
  deleteRentalItem,
  escalateRentalItem,
} from '../../../src/services/rentals';
import { getRatingsForItem } from '../../../src/services/rental-ratings';

export default function RentalItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [escalateDialogVisible, setEscalateDialogVisible] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const { data: item, isLoading, refetch } = useQuery({
    queryKey: ['rental-item', id],
    queryFn: () => getRentalItem(id!),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['item-reviews', id],
    queryFn: () => getRatingsForItem(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: (newAvail: boolean) => toggleItemAvailability(id!, newAvail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-item', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRentalItem(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
      Alert.alert('Deleted', 'Listing has been removed.');
      router.replace('/(app)/rentals' as never);
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (reason: string) => escalateRentalItem(id!, reason),
    onSuccess: () => {
      setEscalateDialogVisible(false);
      setEscalateReason('');
      queryClient.invalidateQueries({ queryKey: ['rental-item', id] });
      Alert.alert('Escalated', 'Your item has been submitted to the Society President for review.');
    },
  });

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const ownerId = typeof item.ownerId === 'object' ? item.ownerId?._id : item.ownerId;
  const isOwner = user?.userId === ownerId;
  const flatNumber =
    typeof item.flatId === 'object' && item.flatId ? item.flatId.number : item.pickupLocation;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        {item.photos && item.photos.length > 0 ? (
          <Image
            source={{ uri: item.photos[0] }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.placeholderImage]}>
            <Text variant="titleMedium" style={{ color: '#9E9E9E' }}>
              No photo uploaded
            </Text>
          </View>
        )}

        {}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={styles.title}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text variant="bodySmall" style={styles.categorySub}>
                    {item.category.toUpperCase()} • Flat {flatNumber}
                  </Text>
                  {item.ratingCount && item.ratingCount > 0 ? (
                    <Chip compact icon="star" style={{ backgroundColor: '#FFF8E1' }}>
                      {item.averageRating} ({item.ratingCount})
                    </Chip>
                  ) : null}
                </View>
              </View>

              <Chip
                style={[
                  styles.statusChip,
                  item.isAvailable ? styles.availableChip : styles.unavailableChip,
                ]}
              >
                {item.isAvailable ? 'Available' : 'Paused / Unavailable'}
              </Chip>
            </View>

            {item.aiPriceVerification && (
              <View style={styles.aiVerificationBox}>
                <View style={styles.aiBadgeRow}>
                  <Chip icon="check-decagram" compact style={styles.aiBadge}>
                    Price Verified by AI: {item.aiPriceVerification.verdict}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={styles.aiReason}>
                  {item.aiPriceVerification.reason}
                </Text>
              </View>
            )}

            <Divider style={{ marginVertical: 12 }} />

            {}
            <Text variant="titleSmall" style={styles.sectionHeading}>
              Rental Rates & Escrow Deposit
            </Text>
            <View style={styles.ratesContainer}>
              {item.chargeHourlyPaise ? (
                <View style={styles.rateBox}>
                  <Text variant="headlineSmall" style={styles.rateValue}>
                    ₹{(item.chargeHourlyPaise / 100).toFixed(0)}
                  </Text>
                  <Text variant="bodySmall" style={styles.rateUnit}>
                    per hour
                  </Text>
                </View>
              ) : null}

              {item.chargeDailyPaise ? (
                <View style={styles.rateBox}>
                  <Text variant="headlineSmall" style={styles.rateValue}>
                    ₹{(item.chargeDailyPaise / 100).toFixed(0)}
                  </Text>
                  <Text variant="bodySmall" style={styles.rateUnit}>
                    per day
                  </Text>
                </View>
              ) : null}

              <View style={[styles.rateBox, styles.depositBox]}>
                <Text variant="headlineSmall" style={[styles.rateValue, { color: '#2E7D32' }]}>
                  ₹{(item.safeDepositPaise / 100).toFixed(0)}
                </Text>
                <Text variant="bodySmall" style={styles.rateUnit}>
                  refundable deposit
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleSmall" style={styles.sectionHeading}>
              Item Condition & Specs
            </Text>
            <View style={styles.metaRow}>
              <Text variant="bodyMedium" style={styles.metaLabel}>
                Condition:
              </Text>
              <Chip compact>{item.condition.replace('_', ' ')}</Chip>
            </View>

            <View style={styles.metaRow}>
              <Text variant="bodyMedium" style={styles.metaLabel}>
                Approx Age:
              </Text>
              <Text variant="bodyMedium">{item.ageYears} year(s)</Text>
            </View>

            <View style={styles.metaRow}>
              <Text variant="bodyMedium" style={styles.metaLabel}>
                Pickup At:
              </Text>
              <Text variant="bodyMedium">{item.pickupLocation}</Text>
            </View>

            <Divider style={{ marginVertical: 6 }} />

            <Text variant="titleSmall" style={styles.sectionHeading}>
              Description
            </Text>
            <Text variant="bodyMedium" style={styles.descText}>
              {item.description}
            </Text>

            {item.usageRules && item.usageRules.length > 0 && (
              <>
                <Divider style={{ marginVertical: 6 }} />
                <Text variant="titleSmall" style={styles.sectionHeading}>
                  Usage Rules
                </Text>
                {item.usageRules.map((rule, idx) => (
                  <Text key={idx} variant="bodySmall" style={styles.ruleItem}>
                    • {rule}
                  </Text>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        {}
        {reviews.length > 0 && (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.titleRow}>
                <Text variant="titleSmall" style={styles.sectionHeading}>
                  Neighbour Reviews ({reviews.length})
                </Text>
                {item.averageRating ? (
                  <Chip compact icon="star" style={{ backgroundColor: '#FFF8E1' }}>
                    {item.averageRating} / 5
                  </Chip>
                ) : null}
              </View>
              {reviews.map((r, idx) => (
                <View key={idx} style={{ backgroundColor: '#F9F9F9', padding: 8, borderRadius: 6, marginVertical: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                      {typeof r.raterId === 'object' ? r.raterId.username : 'Neighbour'}
                    </Text>
                    <Text style={{ color: '#F57F17', fontWeight: '800' }}>
                      {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                    </Text>
                  </View>
                  {r.comment ? (
                    <Text variant="bodySmall" style={{ color: '#616161', marginTop: 2 }}>
                      "{r.comment}"
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {}
        {isOwner ? (
          <Card style={[styles.card, styles.ownerCard]} mode="elevated">
            <Card.Content style={{ gap: 10 }}>
              <Text variant="titleMedium" style={styles.ownerTitle}>
                Owner Settings
              </Text>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    Available for Sharing
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#757575' }}>
                    Toggle off to pause bookings without deleting the listing.
                  </Text>
                </View>
                <Switch
                  value={item.isAvailable}
                  onValueChange={(val) => toggleMutation.mutate(val)}
                />
              </View>

              {item.status === 'DRAFT' && (
                <Button
                  mode="contained-tonal"
                  icon="shield-alert"
                  onPress={() => setEscalateDialogVisible(true)}
                  style={{ marginTop: 4 }}
                >
                  Disagree with AI? Escalate to President
                </Button>
              )}

              <Button
                mode="outlined"
                textColor="#D32F2F"
                icon="delete-outline"
                onPress={() => {
                  Alert.alert(
                    'Delete Item',
                    'Are you sure you want to remove this item listing?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                    ],
                  );
                }}
              >
                Delete Listing
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 4 }}>
                Ready to Borrow?
              </Text>
              <Text variant="bodySmall" style={{ color: '#757575', marginBottom: 12 }}>
                Booking request, calendar slot selection, escrow safe deposit, and photo proof handover start here.
              </Text>
              <Button
                mode="contained"
                icon="calendar-clock"
                disabled={!item.isAvailable}
                onPress={() => {
                  router.push(`/(app)/rentals/book?id=${item._id}` as never);
                }}
              >
                {item.isAvailable ? 'Request to Rent' : 'Item Currently Unavailable'}
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {}
      <Portal>
        <Dialog
          visible={escalateDialogVisible}
          onDismiss={() => setEscalateDialogVisible(false)}
        >
          <Dialog.Title>Escalate to President</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 10 }}>
              Explain why you believe your requested price or deposit is fair for this item.
            </Text>
            <TextInput
              label="Reason for President Review"
              value={escalateReason}
              onChangeText={setEscalateReason}
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEscalateDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={escalateMutation.isPending}
              disabled={!escalateReason.trim() || escalateMutation.isPending}
              onPress={() => escalateMutation.mutate(escalateReason.trim())}
            >
              Submit Review
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 32 },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#EEEEEE',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    color: '#212121',
  },
  categorySub: {
    color: '#757575',
    marginTop: 2,
    fontWeight: '500',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  availableChip: {
    backgroundColor: '#E8F5E9',
  },
  unavailableChip: {
    backgroundColor: '#FFEBEE',
  },
  aiVerificationBox: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C5E1A5',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  aiBadge: {
    backgroundColor: '#DCEDC8',
  },
  aiReason: {
    color: '#33691E',
    fontWeight: '500',
  },
  sectionHeading: {
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
  },
  ratesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  rateBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  depositBox: {
    backgroundColor: '#E8F5E9',
  },
  rateValue: {
    fontWeight: '700',
    color: '#1565C0',
  },
  rateUnit: {
    color: '#616161',
    marginTop: 2,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontWeight: '500',
    color: '#616161',
  },
  descText: {
    color: '#424242',
    lineHeight: 20,
  },
  ruleItem: {
    color: '#616161',
    marginVertical: 2,
  },
  ownerCard: {
    borderColor: '#90CAF9',
    borderWidth: 1,
  },
  ownerTitle: {
    fontWeight: '700',
    color: '#1565C0',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
