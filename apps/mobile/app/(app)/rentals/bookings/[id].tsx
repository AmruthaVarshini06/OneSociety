import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Divider,
  Dialog,
  Portal,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/auth';
import {
  getBookingById,
  respondToBooking,
  payForBooking,
  cancelBooking,
  uploadPickupPhotos,
  confirmHandover,
  requestExtension,
  respondExtension,
  payExtension,
  uploadReturnPhotos,
  confirmReturn,
  payOvertime,
  renterConfirmReturn,
  settleBooking,
} from '../../../../src/services/rental-bookings';
import {
  getDisputeByBookingId,
  createDispute,
  respondToDispute,
  escalateDispute,
  type DisputeCategory,
} from '../../../../src/services/rental-disputes';
import {
  getRatingsForBooking,
  submitRating,
  type RentalRating,
} from '../../../../src/services/rental-ratings';

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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [returnPhotoDialogVisible, setReturnPhotoDialogVisible] = useState(false);
  const [returnPhotoCaption, setReturnPhotoCaption] = useState('');
  const [extensionDialogVisible, setExtensionDialogVisible] = useState(false);
  const [extensionUnits, setExtensionUnits] = useState('1');

  const [disputeDialogVisible, setDisputeDialogVisible] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('DAMAGE');
  const [disputeAmount, setDisputeAmount] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [contestDialogVisible, setContestDialogVisible] = useState(false);
  const [contestNote, setContestNote] = useState('');

  const [ratingDialogVisible, setRatingDialogVisible] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
  });

  const { data: dispute } = useQuery({
    queryKey: ['dispute', id],
    queryFn: () => getDisputeByBookingId(id!),
    enabled: !!id && (booking?.status === 'IN_DISPUTE' || booking?.status === 'SETTLED'),
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['ratings', id],
    queryFn: () => getRatingsForBooking(id!),
    enabled: !!id && (booking?.status === 'RETURNED' || booking?.status === 'SETTLED'),
  });

  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    totalSeconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0, isOverdue: false, totalSeconds: 0 });

  useEffect(() => {
    if (booking?.status !== 'IN_USE') return;

    const targetTime = new Date(booking.effectiveEndAt || booking.expectedEndAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;
      if (diff <= 0) {
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isOverdue: true, totalSeconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isOverdue: false, totalSeconds: Math.floor(diff / 1000) });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking?.status, booking?.effectiveEndAt, booking?.expectedEndAt]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['dispute', id] });
    queryClient.invalidateQueries({ queryKey: ['ratings', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const respondMutation = useMutation({
    mutationFn: (action: 'ACCEPT' | 'DECLINE') => respondToBooking(id!, action),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
    },
  });

  const payMutation = useMutation({
    mutationFn: () => payForBooking(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert(
        'Payment Complete!',
        'Escrow hold confirmed. Your booking slot is locked. Coordinate with the owner for pickup.',
      );
    },
    onError: (err: unknown) => {
      Alert.alert('Payment Failed', err instanceof Error ? err.message : 'Payment failed');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(id!),
    onSuccess: () => {
      invalidate();
      router.replace('/(app)/rentals/bookings' as never);
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Cancel failed');
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: (photos: Array<{ url: string; caption?: string }>) =>
      uploadPickupPhotos(id!, photos),
    onSuccess: () => {
      invalidate();
      setPhotoDialogVisible(false);
      setPhotoCaption('');
      Alert.alert('Photo Uploaded', 'Pickup condition photo saved with automatic timestamp.');
    },
    onError: (err: unknown) => {
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Photo upload failed');
    },
  });

  const confirmHandoverMutation = useMutation({
    mutationFn: () => confirmHandover(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert('Handover Confirmed!', 'The rental has started and the return countdown is active.');
    },
    onError: (err: unknown) => {
      Alert.alert('Confirmation Error', err instanceof Error ? err.message : 'Handover failed');
    },
  });

  const requestExtensionMutation = useMutation({
    mutationFn: (units: number) => requestExtension(id!, units),
    onSuccess: () => {
      invalidate();
      setExtensionDialogVisible(false);
      Alert.alert('Extension Requested', 'The owner has been notified of your extension request.');
    },
    onError: (err: unknown) => {
      Alert.alert('Extension Error', err instanceof Error ? err.message : 'Request failed');
    },
  });

  const respondExtensionMutation = useMutation({
    mutationFn: (action: 'APPROVE' | 'DECLINE') => respondExtension(id!, action),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
    },
  });

  const payExtensionMutation = useMutation({
    mutationFn: () => payExtension(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert('Extension Confirmed', 'Additional payment placed in escrow. Return time updated.');
    },
    onError: (err: unknown) => {
      Alert.alert('Payment Error', err instanceof Error ? err.message : 'Payment failed');
    },
  });

  const uploadReturnPhotosMutation = useMutation({
    mutationFn: (photos: Array<{ url: string; caption?: string }>) =>
      uploadReturnPhotos(id!, photos),
    onSuccess: () => {
      invalidate();
      setReturnPhotoDialogVisible(false);
      setReturnPhotoCaption('');
      Alert.alert('Return Photo Uploaded', 'Return condition photo recorded with timestamp.');
    },
    onError: (err: unknown) => {
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Return photo upload failed');
    },
  });

  const confirmReturnMutation = useMutation({
    mutationFn: ({ condition, notes }: { condition: 'GOOD' | 'ISSUE'; notes?: string }) =>
      confirmReturn(id!, condition, notes),
    onSuccess: (data) => {
      invalidate();
      if (data.status === 'IN_DISPUTE') {
        Alert.alert('Issue Raised', 'Deposit frozen. Dispute opened for mutual agreement or presidential review.');
      } else if (data.status === 'RETURNED') {
        Alert.alert('Return Completed!', 'Item return confirmed in good condition. Proceeding to settlement.');
      } else {
        Alert.alert('Return Processed', 'Good condition confirmed. Overtime payment pending from renter.');
      }
    },
    onError: (err: unknown) => {
      Alert.alert('Return Error', err instanceof Error ? err.message : 'Failed to confirm return');
    },
  });

  const payOvertimeMutation = useMutation({
    mutationFn: (method: 'DIRECT_PAYMENT' | 'DEDUCT_FROM_DEPOSIT') =>
      payOvertime(id!, method),
    onSuccess: () => {
      invalidate();
      Alert.alert('Overtime Settled!', 'Overtime fee settled. Return is now closed and marked RETURNED.');
    },
    onError: (err: unknown) => {
      Alert.alert('Payment Error', err instanceof Error ? err.message : 'Overtime settlement failed');
    },
  });

  const renterConfirmMutation = useMutation({
    mutationFn: () => renterConfirmReturn(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert('Satisfaction Confirmed', 'Thank you for confirming your satisfaction with this rental!');
    },
    onError: (err: unknown) => {
      Alert.alert('Confirmation Error', err instanceof Error ? err.message : 'Confirmation failed');
    },
  });

  const settleMutation = useMutation({
    mutationFn: () => settleBooking(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert('Settlement Completed!', 'Escrow released to owner and safe deposit refunded to renter.');
    },
    onError: (err: unknown) => {
      Alert.alert('Settlement Error', err instanceof Error ? err.message : 'Settlement failed');
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: () =>
      createDispute(id!, {
        claimedAmountPaise: Math.round(parseFloat(disputeAmount || '0') * 100),
        issueCategory: disputeCategory,
        description: disputeDescription.trim(),
        evidencePhotos: (booking?.returnPhotos || []).map((p) => p.url),
      }),
    onSuccess: () => {
      invalidate();
      setDisputeDialogVisible(false);
      Alert.alert('Dispute Filed', 'Your claim has been submitted and safe deposit is frozen.');
    },
    onError: (err: unknown) => {
      Alert.alert('Dispute Error', err instanceof Error ? err.message : 'Failed to file dispute');
    },
  });

  const respondDisputeMutation = useMutation({
    mutationFn: ({ action, note }: { action: 'ACCEPT' | 'CONTEST'; note?: string }) =>
      respondToDispute(id!, action, note),
    onSuccess: (data) => {
      invalidate();
      setContestDialogVisible(false);
      if (data.status === 'RESOLVED_MUTUAL') {
        Alert.alert('Dispute Agreed & Settled', 'Claim accepted and escrow settled mutually.');
      } else {
        Alert.alert('Dispute Contested', 'Case escalated to the Society President for binding ruling.');
      }
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to respond to dispute');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalateDispute(id!),
    onSuccess: () => {
      invalidate();
      Alert.alert('Escalated', 'Dispute has been sent to the Society President.');
    },
    onError: (err: unknown) => {
      Alert.alert('Escalation Error', err instanceof Error ? err.message : 'Failed to escalate');
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: () =>
      submitRating(id!, {
        stars: ratingStars,
        comment: ratingComment.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setRatingDialogVisible(false);
      Alert.alert('Review Submitted', 'Thank you for rating your rental experience!');
    },
    onError: (err: unknown) => {
      Alert.alert('Rating Error', err instanceof Error ? err.message : 'Failed to submit rating');
    },
  });

  if (isLoading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const item = typeof booking.itemId === 'object' && booking.itemId ? booking.itemId : null;
  const renter = typeof booking.renterId === 'object' && booking.renterId ? booking.renterId : null;
  const owner = typeof booking.ownerId === 'object' && booking.ownerId ? booking.ownerId : null;
  const renterFlat = typeof booking.renterFlatId === 'object' && booking.renterFlatId ? booking.renterFlatId : null;
  const ownerFlat = typeof booking.ownerFlatId === 'object' && booking.ownerFlatId ? booking.ownerFlatId : null;

  const renterId = renter?._id ?? '';
  const ownerId = owner?._id ?? '';
  const isRenter = user?.userId === renterId;
  const isOwner = user?.userId === ownerId;

  const statusStyle = STATUS_COLORS[booking.status] ?? { bg: '#F5F5F5', text: '#616161' };
  const renterPhotos = (booking.pickupPhotos || []).filter((p) => p.uploadedBy === 'RENTER');
  const ownerReturnPhotos = (booking.returnPhotos || []).filter((p) => p.uploadedBy === 'OWNER');
  const hasMinPickupPhotos = renterPhotos.length >= 2;
  const hasMinReturnPhotos = ownerReturnPhotos.length >= 2;

  const parsedUnits = parseInt(extensionUnits, 10) || 1;
  const extExtraPaise = booking.ratePerUnitPaise * parsedUnits;

  const myRating = ratings.find(
    (r) => (typeof r.raterId === 'object' ? r.raterId._id : r.raterId) === user?.userId,
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={styles.itemName}>
                  {item?.name ?? 'Rental Item'}
                </Text>
                <Text variant="bodySmall" style={styles.catText}>
                  {item?.category?.toUpperCase()}
                </Text>
              </View>
              <Chip
                style={{ backgroundColor: statusStyle.bg }}
                textStyle={{ color: statusStyle.text, fontWeight: '800' }}
              >
                {booking.status.replace(/_/g, ' ')}
              </Chip>
            </View>

            <Divider style={{ marginVertical: 10 }} />

            {}
            <View style={styles.partiesRow}>
              <View style={styles.party}>
                <Text variant="labelSmall" style={styles.partyLabel}>RENTER</Text>
                <Text variant="bodyMedium" style={styles.partyName}>
                  {renter?.username ?? '—'}
                </Text>
                <Text variant="bodySmall" style={styles.partyFlat}>
                  Flat {renterFlat?.number ?? '—'}
                </Text>
              </View>
              <Text variant="titleLarge" style={{ color: '#BDBDBD', paddingTop: 10 }}>→</Text>
              <View style={styles.party}>
                <Text variant="labelSmall" style={styles.partyLabel}>OWNER</Text>
                <Text variant="bodyMedium" style={styles.partyName}>
                  {owner?.username ?? '—'}
                </Text>
                <Text variant="bodySmall" style={styles.partyFlat}>
                  Flat {ownerFlat?.number ?? '—'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {}
        {booking.status === 'SETTLED' && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9', borderColor: '#81C784', borderWidth: 1 }]} mode="elevated">
            <Card.Content style={{ gap: 6 }}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#1B5E20' }}>
                  🤝 Escrow Settlement Complete
                </Text>
                <Chip icon="check-all" compact style={{ backgroundColor: '#C8E6C9' }}>
                  Settled
                </Chip>
              </View>
              <Divider style={{ marginVertical: 6 }} />
              <View style={styles.scheduleRow}>
                <Text variant="bodyMedium" style={{ color: '#616161' }}>Owner Payout Released:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '800', color: '#1B5E20' }}>
                  ₹{((booking.finalChargeReleasedPaise || 0) / 100).toFixed(0)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text variant="bodyMedium" style={{ color: '#616161' }}>Renter Safe Deposit Refund:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '800', color: '#1565C0' }}>
                  ₹{((booking.depositRefundedPaise || 0) / 100).toFixed(0)}
                </Text>
              </View>
              {booking.settledAt && (
                <Text variant="labelSmall" style={{ color: '#757575', marginTop: 4 }}>
                  Settled on {formatDate(booking.settledAt.toString())}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {booking.status === 'RETURNED' && (
          <Card style={[styles.card, { backgroundColor: '#F1F8E9', borderColor: '#A5D6A7', borderWidth: 1 }]} mode="elevated">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '800', color: '#2E7D32', marginBottom: 4 }}>
                Ready for Escrow Settlement
              </Text>
              <Text variant="bodySmall" style={{ color: '#33691E', marginBottom: 12 }}>
                Both parties have returned and verified the item. Tapping settle executes automated escrow releases to owner and deposit refund to renter.
              </Text>
              <Button
                mode="contained"
                buttonColor="#2E7D32"
                icon="cash-check"
                loading={settleMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Execute Settlement',
                    'Release rental earnings to owner and refund safe deposit to renter?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Settle Escrow', onPress: () => settleMutation.mutate() },
                    ],
                  )
                }
              >
                Execute Escrow Settlement
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        {booking.status === 'IN_DISPUTE' && dispute && (
          <Card style={[styles.card, { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A', borderWidth: 1 }]} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#B71C1C' }}>
                  ⚠️ Damage Claim / Dispute
                </Text>
                <Chip compact style={{ backgroundColor: '#FFCDD2' }}>
                  {dispute.status.replace(/_/g, ' ')}
                </Chip>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <View style={styles.scheduleRow}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Issue Category:</Text>
                <Chip compact>{dispute.issueCategory.replace(/_/g, ' ')}</Chip>
              </View>

              <View style={styles.scheduleRow}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Owner Claim Amount:</Text>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#C62828' }}>
                  ₹{(dispute.claimedAmountPaise / 100).toFixed(0)}
                </Text>
              </View>

              <Text variant="bodySmall" style={{ color: '#424242' }}>
                <Text style={{ fontWeight: '700' }}>Owner Description: </Text>
                {dispute.ownerDescription}
              </Text>

              {dispute.renterCounterNote && (
                <Text variant="bodySmall" style={{ color: '#1565C0' }}>
                  <Text style={{ fontWeight: '700' }}>Renter Counter Note: </Text>
                  {dispute.renterCounterNote}
                </Text>
              )}

              {}
              {isRenter && dispute.status === 'OPEN' && (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <Text variant="bodySmall" style={{ fontWeight: '600', color: '#B71C1C' }}>
                    Respond to Owner's Claim:
                  </Text>
                  <View style={styles.actionRow}>
                    <Button
                      mode="outlined"
                      textColor="#D32F2F"
                      style={{ flex: 1 }}
                      onPress={() => setContestDialogVisible(true)}
                    >
                      Contest Claim
                    </Button>
                    <Button
                      mode="contained"
                      buttonColor="#2E7D32"
                      style={{ flex: 1 }}
                      loading={respondDisputeMutation.isPending}
                      onPress={() =>
                        Alert.alert(
                          'Accept Claim',
                          `Accept the deduction of ₹${(dispute.claimedAmountPaise / 100).toFixed(0)} from your safe deposit and settle?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Accept & Settle',
                              onPress: () => respondDisputeMutation.mutate({ action: 'ACCEPT' }),
                            },
                          ],
                        )
                      }
                    >
                      Accept Claim
                    </Button>
                  </View>
                </View>
              )}

              {}
              {dispute.status === 'OPEN' && (
                <Button
                  mode="text"
                  textColor="#1565C0"
                  icon="shield-alert"
                  loading={escalateMutation.isPending}
                  onPress={() => escalateMutation.mutate()}
                >
                  Cannot Agree? Escalate to President
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {booking.status === 'IN_USE' && (
          <Card
            style={[
              styles.card,
              timeLeft.isOverdue
                ? styles.overdueCard
                : timeLeft.totalSeconds < 900
                ? styles.warningCard
                : styles.activeTimerCard,
            ]}
            mode="elevated"
          >
            <Card.Content>
              <View style={styles.timerHeader}>
                <Text
                  variant="labelSmall"
                  style={[
                    styles.timerSubtitle,
                    {
                      color: timeLeft.isOverdue
                        ? '#B71C1C'
                        : timeLeft.totalSeconds < 900
                        ? '#E65100'
                        : '#1B5E20',
                    },
                  ]}
                >
                  {timeLeft.isOverdue ? '⚠️ OVERDUE FOR RETURN' : '⏱️ RENTAL TIME REMAINING'}
                </Text>
                <Chip
                  compact
                  style={{
                    backgroundColor: timeLeft.isOverdue
                      ? '#FFCDD2'
                      : timeLeft.totalSeconds < 900
                      ? '#FFE0B2'
                      : '#C8E6C9',
                  }}
                >
                  {timeLeft.isOverdue ? 'Overtime' : 'Active'}
                </Chip>
              </View>

              <Text
                variant="displaySmall"
                style={[
                  styles.timerDigits,
                  {
                    color: timeLeft.isOverdue
                      ? '#C62828'
                      : timeLeft.totalSeconds < 900
                      ? '#E65100'
                      : '#2E7D32',
                  },
                ]}
              >
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </Text>

              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.scheduleRow}>
                <Text variant="bodySmall" style={{ color: '#616161' }}>
                  Handover clock started:
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {booking.actualStartAt ? formatTime(booking.actualStartAt) : '—'}
                </Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text variant="bodySmall" style={{ color: '#616161' }}>
                  Scheduled return deadline:
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    fontWeight: '700',
                    color: timeLeft.isOverdue ? '#C62828' : '#212121',
                  }}
                >
                  {formatDate(booking.effectiveEndAt || booking.expectedEndAt)}
                </Text>
              </View>

              {timeLeft.totalSeconds > 0 && timeLeft.totalSeconds <= 3600 && (
                <View style={styles.reminderBanner}>
                  <Text variant="bodySmall" style={{ color: '#E65100', fontWeight: '600' }}>
                    🔔 Reminder: Less than 1 hour remaining! Prepare to return or request an extension.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {(booking.finalRentalChargePaise !== undefined ||
          booking.status === 'RETURNED' ||
          booking.status === 'SETTLED' ||
          booking.status === 'RETURN_PENDING') && (
          <Card style={[styles.card, { backgroundColor: '#F1F8E9', borderColor: '#C5E1A5', borderWidth: 1 }]} mode="elevated">
            <Card.Content style={{ gap: 6 }}>
              <View style={styles.headerRow}>
                <Text variant="titleSmall" style={{ fontWeight: '700', color: '#33691E' }}>
                  Time-Based Final Charge
                </Text>
                <Chip compact style={{ backgroundColor: '#DCEDC8' }}>
                  {booking.billedUnits} {booking.billingUnit.toLowerCase()}s billed
                </Chip>
              </View>

              <Divider style={{ marginVertical: 6 }} />

              <View style={styles.scheduleRow}>
                <Text variant="bodySmall" style={{ color: '#616161' }}>Booked Duration:</Text>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {booking.bookedUnits} {booking.billingUnit.toLowerCase()}(s)
                </Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text variant="bodySmall" style={{ color: '#616161' }}>Actual Billed Usage:</Text>
                <Text variant="bodySmall" style={{ fontWeight: '700', color: '#1B5E20' }}>
                  {booking.billedUnits} {booking.billingUnit.toLowerCase()}(s) (15m grace applied)
                </Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text variant="bodySmall" style={{ color: '#616161' }}>Final Rental Charge:</Text>
                <Text variant="bodySmall" style={{ fontWeight: '800', color: '#1565C0' }}>
                  ₹{((booking.finalRentalChargePaise || booking.chargeCalculation.chargePaise) / 100).toFixed(0)}
                </Text>
              </View>

              {}
              {(booking.earlyRefundPaise || 0) > 0 && (
                <View style={styles.earlyRefundBanner}>
                  <Text variant="bodySmall" style={{ color: '#1B5E20', fontWeight: '700' }}>
                    🎉 Early Return: ₹{((booking.earlyRefundPaise || 0) / 100).toFixed(0)} refunded for unused time!
                  </Text>
                </View>
              )}

              {}
              {(booking.overtimeChargePaise || 0) > 0 && (
                <View style={styles.overtimeBanner}>
                  <Text variant="bodySmall" style={{ color: '#B71C1C', fontWeight: '700' }}>
                    ⏰ Late Return: ₹{((booking.overtimeChargePaise || 0) / 100).toFixed(0)} overtime fee
                  </Text>
                  {booking.overtimePaid ? (
                    <Chip compact icon="check" style={{ backgroundColor: '#C8E6C9', marginTop: 4 }}>
                      Overtime Settled ({booking.overtimePaymentMethod?.replace(/_/g, ' ')})
                    </Chip>
                  ) : (
                    <Text variant="labelSmall" style={{ color: '#C62828', marginTop: 2 }}>
                      Payment due before return completion
                    </Text>
                  )}
                </View>
              )}

              {}
              {isRenter && (booking.overtimeChargePaise || 0) > 0 && !booking.overtimePaid && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                    Select Overtime Payment Option:
                  </Text>
                  <View style={styles.actionRow}>
                    <Button
                      mode="contained-tonal"
                      style={{ flex: 1 }}
                      loading={payOvertimeMutation.isPending}
                      onPress={() => payOvertimeMutation.mutate('DEDUCT_FROM_DEPOSIT')}
                    >
                      Deduct from Deposit
                    </Button>
                    <Button
                      mode="contained"
                      buttonColor="#1565C0"
                      style={{ flex: 1 }}
                      loading={payOvertimeMutation.isPending}
                      onPress={() => payOvertimeMutation.mutate('DIRECT_PAYMENT')}
                    >
                      Pay Directly
                    </Button>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {((booking.pickupPhotos && booking.pickupPhotos.length > 0) ||
          (booking.returnPhotos && booking.returnPhotos.length > 0)) && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Condition Verification (Pickup vs. Return)
              </Text>
              <Text variant="bodySmall" style={{ color: '#757575', marginBottom: 8 }}>
                Compare photos taken at handover with photos taken upon return.
              </Text>

              <View style={styles.comparisonGrid}>
                {}
                <View style={styles.compColumn}>
                  <Text variant="labelSmall" style={styles.compLabel}>PICKUP CONDITION</Text>
                  {booking.pickupPhotos && booking.pickupPhotos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {booking.pickupPhotos.map((p, idx) => (
                        <View key={idx} style={styles.compPhotoCard}>
                          <Image source={{ uri: p.url }} style={styles.compPhoto} />
                          <Text variant="labelSmall" style={styles.compTime}>
                            {formatTime(p.timestamp)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#9E9E9E', fontStyle: 'italic' }}>
                      No pickup photos
                    </Text>
                  )}
                </View>

                {}
                <View style={styles.compColumn}>
                  <Text variant="labelSmall" style={styles.compLabel}>RETURN CONDITION</Text>
                  {booking.returnPhotos && booking.returnPhotos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {booking.returnPhotos.map((p, idx) => (
                        <View key={idx} style={styles.compPhotoCard}>
                          <Image source={{ uri: p.url }} style={styles.compPhoto} />
                          <Text variant="labelSmall" style={styles.compTime}>
                            {formatTime(p.timestamp)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#9E9E9E', fontStyle: 'italic' }}>
                      {hasMinReturnPhotos ? 'Photos loaded' : 'Awaiting return photos'}
                    </Text>
                  )}
                </View>
              </View>

              {}
              {isOwner && (booking.status === 'IN_USE' || booking.status === 'RETURN_PENDING') && (
                <Button
                  mode="contained-tonal"
                  icon="camera"
                  style={{ marginTop: 10 }}
                  onPress={() => setReturnPhotoDialogVisible(true)}
                >
                  {ownerReturnPhotos.length < 2
                    ? `Snap Return Photo (${ownerReturnPhotos.length}/2 uploaded)`
                    : 'Add Another Return Photo'}
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {isOwner && (booking.status === 'IN_USE' || booking.status === 'RETURN_PENDING') && (
          <Card style={[styles.card, { backgroundColor: '#EDE7F6' }]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: '#4A148C', marginBottom: 4 }}>
                Confirm Return & Condition
              </Text>
              <Text variant="bodySmall" style={{ color: '#6A1B9A', marginBottom: 10 }}>
                {hasMinReturnPhotos
                  ? 'Verify the item condition against the pickup baseline. Confirm good condition or raise an issue.'
                  : 'You must snap at least 2 return photos of the item before you can confirm return.'}
              </Text>
              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  textColor="#D32F2F"
                  icon="alert-octagon"
                  style={{ flex: 1 }}
                  disabled={!hasMinReturnPhotos || confirmReturnMutation.isPending}
                  onPress={() => setDisputeDialogVisible(true)}
                >
                  Raise an Issue
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  icon="check-circle"
                  style={{ flex: 1 }}
                  disabled={!hasMinReturnPhotos || confirmReturnMutation.isPending}
                  loading={confirmReturnMutation.isPending}
                  onPress={() =>
                    confirmReturnMutation.mutate({ condition: 'GOOD' })
                  }
                >
                  Good Condition
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {}
        {isRenter && booking.status === 'RETURNED' && !booking.renterSatisfactionConfirmed && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: '#1B5E20', marginBottom: 4 }}>
                Confirm Rental Satisfaction
              </Text>
              <Text variant="bodySmall" style={{ color: '#2E7D32', marginBottom: 10 }}>
                The item has been returned and verified by the owner. Tap below to confirm satisfaction and finalize settlement.
              </Text>
              <Button
                mode="contained"
                buttonColor="#1B5E20"
                icon="thumb-up"
                loading={renterConfirmMutation.isPending}
                onPress={() => renterConfirmMutation.mutate()}
              >
                Confirm Satisfaction
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        {(booking.status === 'RETURNED' || booking.status === 'SETTLED') && (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.headerRow}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Ratings & Reviews
                </Text>
                {!myRating && (
                  <Button
                    mode="contained-tonal"
                    compact
                    icon="star"
                    onPress={() => setRatingDialogVisible(true)}
                  >
                    Rate
                  </Button>
                )}
              </View>

              {ratings.length > 0 ? (
                ratings.map((r, idx) => (
                  <View key={idx} style={styles.ratingRow}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                        {typeof r.raterId === 'object' ? r.raterId.username : 'Neighbour'} ({r.raterRole})
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
                ))
              ) : (
                <Text variant="bodySmall" style={{ color: '#9E9E9E', fontStyle: 'italic' }}>
                  No reviews submitted yet. Rate your neighbour to build community trust!
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {booking.status === 'IN_USE' && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Need More Time? (Extension)
              </Text>

              {}
              {(!booking.extension ||
                booking.extension.status === 'NONE' ||
                booking.extension.status === 'DECLINED') && (
                <View>
                  <Text variant="bodySmall" style={{ color: '#757575', marginBottom: 10 }}>
                    You can request extra hours or days before the return time if the item is not booked by a neighbour.
                  </Text>
                  {booking.extension?.status === 'DECLINED' && (
                    <Text variant="bodySmall" style={{ color: '#C62828', marginBottom: 6 }}>
                      Previous extension request was declined by the owner.
                    </Text>
                  )}
                  {isRenter && (
                    <Button
                      mode="outlined"
                      icon="clock-plus-outline"
                      onPress={() => setExtensionDialogVisible(true)}
                    >
                      Request Extension
                    </Button>
                  )}
                </View>
              )}

              {}
              {booking.extension?.status === 'PENDING' && (
                <View style={styles.extPendingBox}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: '#E65100' }}>
                    Extension Requested: +{booking.extension.requestedUnits}{' '}
                    {booking.billingUnit === 'HOUR' ? 'hour(s)' : 'day(s)'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#616161', marginVertical: 4 }}>
                    Additional cost: ₹{(booking.extension.additionalChargePaise / 100).toFixed(0)}
                  </Text>

                  {}
                  {isOwner ? (
                    <View style={styles.actionRow}>
                      <Button
                        mode="outlined"
                        textColor="#D32F2F"
                        style={{ flex: 1 }}
                        loading={respondExtensionMutation.isPending}
                        onPress={() => respondExtensionMutation.mutate('DECLINE')}
                      >
                        Decline
                      </Button>
                      <Button
                        mode="contained"
                        buttonColor="#2E7D32"
                        style={{ flex: 1 }}
                        loading={respondExtensionMutation.isPending}
                        onPress={() => respondExtensionMutation.mutate('APPROVE')}
                      >
                        Approve
                      </Button>
                    </View>
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#E65100', fontStyle: 'italic' }}>
                      Waiting for owner approval...
                    </Text>
                  )}
                </View>
              )}

              {}
              {booking.extension?.status === 'APPROVED' && (
                <View style={styles.extApprovedBox}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: '#1B5E20' }}>
                    Extension Approved by Owner!
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#2E7D32', marginVertical: 4 }}>
                    Pay ₹{(booking.extension.additionalChargePaise / 100).toFixed(0)} into escrow to extend your return deadline by +{booking.extension.requestedUnits}{' '}
                    {booking.billingUnit === 'HOUR' ? 'hour(s)' : 'day(s)'}.
                  </Text>

                  {isRenter && (
                    <Button
                      mode="contained"
                      buttonColor="#1B5E20"
                      icon="cash-check"
                      loading={payExtensionMutation.isPending}
                      onPress={() => payExtensionMutation.mutate()}
                      style={{ marginTop: 6 }}
                    >
                      Pay ₹{(booking.extension.additionalChargePaise / 100).toFixed(0)} & Lock Extra Time
                    </Button>
                  )}
                </View>
              )}

              {}
              {booking.extension?.status === 'PAID' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Chip icon="check-decagram" compact style={{ backgroundColor: '#E8F5E9' }}>
                    Extension Active (+{booking.extension.requestedUnits}{' '}
                    {booking.billingUnit === 'HOUR' ? 'hrs' : 'days'})
                  </Chip>
                  <Text variant="bodySmall" style={{ color: '#2E7D32' }}>
                    Total booked: {booking.bookedUnits}{' '}
                    {booking.billingUnit === 'HOUR' ? 'hrs' : 'days'}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        {isOwner && booking.status === 'PICKUP_PENDING' && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: '#1B5E20', marginBottom: 4 }}>
                Confirm Handover to Renter
              </Text>
              <Text variant="bodySmall" style={{ color: '#2E7D32', marginBottom: 10 }}>
                {hasMinPickupPhotos
                  ? 'Renter has uploaded condition photos. Once the item is physically handed over, confirm to start the rental clock.'
                  : 'Waiting for renter to upload at least 2 condition photos of the item before you can confirm handover.'}
              </Text>
              <Button
                mode="contained"
                buttonColor="#1B5E20"
                icon="handshake"
                disabled={!hasMinPickupPhotos || confirmHandoverMutation.isPending}
                loading={confirmHandoverMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Confirm Handover',
                    'Confirm that you have handed over the item to the renter? The rental clock will start immediately.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm & Start Clock', onPress: () => confirmHandoverMutation.mutate() },
                    ],
                  )
                }
              >
                Confirm Handover & Start Clock
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Booking Schedule</Text>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium" style={styles.scheduleLabel}>Duration:</Text>
              <Text variant="bodyMedium" style={styles.scheduleVal}>
                {booking.bookedUnits} {booking.billingUnit === 'HOUR'
                  ? `hour${booking.bookedUnits > 1 ? 's' : ''}`
                  : `day${booking.bookedUnits > 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium" style={styles.scheduleLabel}>Starts:</Text>
              <Text variant="bodyMedium" style={styles.scheduleVal}>
                {formatDate(booking.startAt)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium" style={styles.scheduleLabel}>Expected End:</Text>
              <Text variant="bodyMedium" style={styles.scheduleVal}>
                {formatDate(booking.effectiveEndAt || booking.expectedEndAt)}
              </Text>
            </View>
            {booking.status === 'REQUESTED' && (
              <View style={styles.scheduleRow}>
                <Text variant="bodyMedium" style={[styles.scheduleLabel, { color: '#E65100' }]}>
                  Owner must respond by:
                </Text>
                <Text variant="bodyMedium" style={{ color: '#E65100', fontWeight: '700' }}>
                  {formatDate(booking.expiresAt)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Payment Breakdown</Text>
            <View style={styles.chargeRow}>
              <Text variant="bodyMedium">
                ₹{(booking.ratePerUnitPaise / 100).toFixed(0)} ×{' '}
                {booking.bookedUnits}{' '}
                {booking.billingUnit === 'HOUR' ? 'hr' : 'day'}
              </Text>
              <Text variant="bodyMedium" style={styles.chargeAmt}>
                ₹{(booking.chargeCalculation.chargePaise / 100).toFixed(0)}
              </Text>
            </View>
            <View style={styles.chargeRow}>
              <Text variant="bodyMedium" style={{ color: '#2E7D32' }}>
                + Refundable Safe Deposit
              </Text>
              <Text variant="bodyMedium" style={[styles.chargeAmt, { color: '#2E7D32' }]}>
                ₹{(booking.chargeCalculation.depositPaise / 100).toFixed(0)}
              </Text>
            </View>
            <Divider style={{ marginVertical: 6 }} />
            <View style={styles.chargeRow}>
              <Text variant="titleSmall" style={{ fontWeight: '800' }}>Total Held in Escrow</Text>
              <Text variant="titleSmall" style={[styles.chargeAmt, { fontWeight: '800', color: '#1565C0' }]}>
                ₹{(booking.chargeCalculation.totalPaise / 100).toFixed(0)}
              </Text>
            </View>

            {booking.escrowHoldKey && (
              <Chip
                icon="shield-lock"
                compact
                style={{ marginTop: 8, backgroundColor: '#E8F5E9', alignSelf: 'flex-start' }}
              >
                Held Securely in Escrow
              </Chip>
            )}
          </Card.Content>
        </Card>

        {}
        {isOwner && booking.status === 'REQUESTED' && (
          <Card style={[styles.card, { backgroundColor: '#E8EAF6' }]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: '#283593', marginBottom: 10 }}>
                Respond to Booking Request
              </Text>
              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  textColor="#D32F2F"
                  style={{ flex: 1 }}
                  loading={respondMutation.isPending}
                  onPress={() =>
                    Alert.alert('Decline Booking', 'Decline this rental request?', [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Decline',
                        style: 'destructive',
                        onPress: () => respondMutation.mutate('DECLINE'),
                      },
                    ])
                  }
                >
                  Decline
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  style={{ flex: 1 }}
                  loading={respondMutation.isPending}
                  onPress={() => respondMutation.mutate('ACCEPT')}
                >
                  Accept
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {}
        {isRenter && booking.status === 'ACCEPTED' && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: '#1B5E20', marginBottom: 6 }}>
                Owner Accepted — Complete Payment
              </Text>
              <Text variant="bodySmall" style={{ color: '#2E7D32', marginBottom: 10 }}>
                ₹{(booking.chargeCalculation.totalPaise / 100).toFixed(0)} will be held safely in escrow until the item is returned and verified.
              </Text>
              <Button
                mode="contained"
                icon="cash-lock"
                buttonColor="#1B5E20"
                loading={payMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Confirm Payment',
                    `Pay ₹${(booking.chargeCalculation.totalPaise / 100).toFixed(0)} into escrow to confirm your slot?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Pay & Confirm', onPress: () => payMutation.mutate() },
                    ],
                  )
                }
              >
                Pay ₹{(booking.chargeCalculation.totalPaise / 100).toFixed(0)} Into Escrow
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        {(booking.status === 'REQUESTED' || booking.status === 'ACCEPTED') && (isRenter || isOwner) && (
          <Button
            mode="text"
            textColor="#D32F2F"
            icon="close-circle"
            loading={cancelMutation.isPending}
            onPress={() =>
              Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: () => cancelMutation.mutate(),
                },
              ])
            }
          >
            Cancel Booking
          </Button>
        )}
      </ScrollView>

      {}
      <Portal>
        <Dialog visible={photoDialogVisible} onDismiss={() => setPhotoDialogVisible(false)}>
          <Dialog.Title>Take Pickup Condition Photo</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Photograph the item at pickup. An automatic timestamp and your identity will be attached to verify baseline condition.
            </Text>
            <TextInput
              label="Optional Note / Caption"
              value={photoCaption}
              onChangeText={setPhotoCaption}
              mode="outlined"
              placeholder="e.g. Clean condition, slight scratch on corner"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPhotoDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              icon="camera"
              loading={uploadPhotosMutation.isPending}
              onPress={() => {
                const samplePhotoUrl = `https://picsum.photos/seed/pickup-${booking._id}-${(booking.pickupPhotos || []).length + 1}/400/300`;
                uploadPhotosMutation.mutate([
                  {
                    url: samplePhotoUrl,
                    caption: photoCaption.trim() || undefined,
                  },
                ]);
              }}
            >
              Snap & Upload
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {}
      <Portal>
        <Dialog visible={returnPhotoDialogVisible} onDismiss={() => setReturnPhotoDialogVisible(false)}>
          <Dialog.Title>Take Return Condition Photo</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Photograph the item upon return. An automatic timestamp will be attached to compare with the pickup baseline.
            </Text>
            <TextInput
              label="Optional Return Condition Note"
              value={returnPhotoCaption}
              onChangeText={setReturnPhotoCaption}
              mode="outlined"
              placeholder="e.g. Returned clean, all parts present"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReturnPhotoDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              icon="camera"
              loading={uploadReturnPhotosMutation.isPending}
              onPress={() => {
                const samplePhotoUrl = `https://picsum.photos/seed/return-${booking._id}-${(booking.returnPhotos || []).length + 1}/400/300`;
                uploadReturnPhotosMutation.mutate([
                  {
                    url: samplePhotoUrl,
                    caption: returnPhotoCaption.trim() || undefined,
                  },
                ]);
              }}
            >
              Snap Return Photo
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {}
      <Portal>
        <Dialog visible={disputeDialogVisible} onDismiss={() => setDisputeDialogVisible(false)}>
          <Dialog.Title>Raise Damage Issue / Claim</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Specify the issue and claimed amount (up to deposit: ₹{(booking.safeDepositPaise / 100).toFixed(0)}).
            </Text>
            <TextInput
              label="Claim Amount (₹)"
              value={disputeAmount}
              onChangeText={setDisputeAmount}
              keyboardType="number-pad"
              mode="outlined"
              placeholder={`Max ₹${(booking.safeDepositPaise / 100).toFixed(0)}`}
            />
            <TextInput
              label="Issue Description & Evidence Notes"
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              multiline
              numberOfLines={3}
              mode="outlined"
              placeholder="e.g. Deep scratch on blade; motor vibrating excessively"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDisputeDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#D32F2F"
              disabled={!disputeDescription.trim() || !disputeAmount.trim() || createDisputeMutation.isPending}
              loading={createDisputeMutation.isPending}
              onPress={() => createDisputeMutation.mutate()}
            >
              File Claim
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {}
      <Portal>
        <Dialog visible={contestDialogVisible} onDismiss={() => setContestDialogVisible(false)}>
          <Dialog.Title>Contest Damage Claim</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Explain why you disagree with the owner's claim. Your pickup photo proof and this explanation will be sent to the President for a binding ruling.
            </Text>
            <TextInput
              label="Your Counter Explanation"
              value={contestNote}
              onChangeText={setContestNote}
              multiline
              numberOfLines={3}
              mode="outlined"
              placeholder="e.g. The scratch was already present at pickup as shown in pickup photo #1."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setContestDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#D32F2F"
              disabled={!contestNote.trim() || respondDisputeMutation.isPending}
              loading={respondDisputeMutation.isPending}
              onPress={() =>
                respondDisputeMutation.mutate({ action: 'CONTEST', note: contestNote.trim() })
              }
            >
              Submit & Escalate
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {}
      <Portal>
        <Dialog visible={ratingDialogVisible} onDismiss={() => setRatingDialogVisible(false)}>
          <Dialog.Title>Rate Rental Experience</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Rate your neighbour and the item. Honest ratings build a trusted society!
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingStars(star)}>
                  <Text style={{ fontSize: 32, color: star <= ratingStars ? '#FFB300' : '#E0E0E0' }}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              label="Optional Review Comment"
              value={ratingComment}
              onChangeText={setRatingComment}
              mode="outlined"
              placeholder="e.g. Great drill, worked smoothly, neighbour was very helpful!"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRatingDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#1565C0"
              loading={submitRatingMutation.isPending}
              onPress={() => submitRatingMutation.mutate()}
            >
              Submit Review
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {}
      <Portal>
        <Dialog visible={extensionDialogVisible} onDismiss={() => setExtensionDialogVisible(false)}>
          <Dialog.Title>Request Extension</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              How many additional {booking.billingUnit.toLowerCase()}s do you need?
            </Text>
            <TextInput
              label={`Additional ${booking.billingUnit === 'HOUR' ? 'Hours' : 'Days'}`}
              value={extensionUnits}
              onChangeText={setExtensionUnits}
              keyboardType="number-pad"
              mode="outlined"
            />
            <View style={styles.extCalcPreview}>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                Estimated Additional Charge:
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: '#1565C0' }}>
                ₹{(extExtraPaise / 100).toFixed(0)}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExtensionDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={requestExtensionMutation.isPending}
              disabled={parsedUnits < 1 || requestExtensionMutation.isPending}
              onPress={() => requestExtensionMutation.mutate(parsedUnits)}
            >
              Send Request
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
  scroll: { padding: 16, gap: 12, paddingBottom: 36 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemName: { fontWeight: '800', color: '#1565C0' },
  catText: { color: '#757575', marginTop: 2 },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  party: { alignItems: 'center' },
  partyLabel: { color: '#9E9E9E', fontWeight: '800', letterSpacing: 1 },
  partyName: { fontWeight: '700', color: '#212121', marginTop: 4 },
  partyFlat: { color: '#757575' },
  sectionTitle: { fontWeight: '700', color: '#424242', marginBottom: 4 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  scheduleLabel: { color: '#616161', fontWeight: '500' },
  scheduleVal: { fontWeight: '600', color: '#212121' },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  chargeAmt: { fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },

  activeTimerCard: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  warningCard: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  overdueCard: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A' },
  timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerSubtitle: { fontWeight: '800', letterSpacing: 0.5 },
  timerDigits: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginVertical: 6,
  },
  reminderBanner: {
    backgroundColor: '#FFE0B2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },

  earlyRefundBanner: {
    backgroundColor: '#C8E6C9',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  overtimeBanner: {
    backgroundColor: '#FFCDD2',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },

  comparisonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  compColumn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  compLabel: {
    fontWeight: '800',
    color: '#616161',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  compPhotoCard: {
    width: 100,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  compPhoto: {
    width: 100,
    height: 75,
    backgroundColor: '#E0E0E0',
  },
  compTime: {
    fontSize: 9,
    color: '#757575',
    padding: 2,
    textAlign: 'center',
  },

  ratingRow: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  extPendingBox: {
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  extApprovedBox: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  extCalcPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
});
