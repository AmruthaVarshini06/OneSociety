import React, { useState } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Divider,
  TextInput,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/auth';
import {
  getItemRequestById,
  acceptItemOffer,
  withdrawItemOffer,
  makeItemOffer,
  cancelItemRequest,
  type ItemOffer,
  type CreateItemOfferPayload,
} from '../../../../src/services/rental-requests';
import { getMyRentalItems } from '../../../../src/services/rentals';
import type { ItemCondition } from '../../../../src/services/rentals';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OfferCard({
  offer,
  isRequester,
  onAccept,
  onWithdraw,
}: {
  offer: ItemOffer;
  isRequester: boolean;
  onAccept?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
}) {
  const lenderName =
    typeof offer.offeredById === 'object' && offer.offeredById
      ? offer.offeredById.username
      : 'Neighbour';
  const flatNum =
    typeof offer.flatId === 'object' && offer.flatId ? offer.flatId.number : '—';

  const statusColors: Record<string, string> = {
    PENDING: '#FFF8E1',
    ACCEPTED: '#E8F5E9',
    DECLINED: '#FFEBEE',
    WITHDRAWN: '#F5F5F5',
  };

  return (
    <Card style={styles.offerCard} mode="outlined">
      <Card.Content>
        <View style={styles.offerHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              {lenderName} · Flat {flatNum}
            </Text>
            <Text variant="bodySmall" style={{ color: '#757575' }}>
              {offer.itemName} · {offer.condition.replace('_', ' ')}
            </Text>
          </View>
          <Chip
            compact
            style={{ backgroundColor: statusColors[offer.status] ?? '#F5F5F5' }}
            textStyle={{ fontSize: 10, fontWeight: '700' }}
          >
            {offer.status}
          </Chip>
        </View>

        {offer.message ? (
          <Text variant="bodySmall" style={styles.offerMessage}>
            "{offer.message}"
          </Text>
        ) : null}

        <View style={styles.offerRates}>
          {offer.chargeHourlyPaise ? (
            <Chip compact icon="clock" style={{ backgroundColor: '#E3F2FD' }}>
              ₹{(offer.chargeHourlyPaise / 100).toFixed(0)}/hr
            </Chip>
          ) : null}
          {offer.chargeDailyPaise ? (
            <Chip compact icon="calendar" style={{ backgroundColor: '#E3F2FD' }}>
              ₹{(offer.chargeDailyPaise / 100).toFixed(0)}/day
            </Chip>
          ) : null}
          <Chip compact icon="shield-check" style={{ backgroundColor: '#E8F5E9' }}>
            Deposit ₹{(offer.safeDepositPaise / 100).toFixed(0)}
          </Chip>
        </View>

        {offer.aiPriceVerification && (
          <View style={styles.aiNote}>
            <Text variant="bodySmall" style={{ color: '#424242' }}>
              <Text style={{ fontWeight: '700' }}>AI: </Text>
              {offer.aiPriceVerification.verdict} — {offer.aiPriceVerification.reason}
            </Text>
          </View>
        )}
      </Card.Content>

      {offer.status === 'PENDING' && (
        <Card.Actions style={{ justifyContent: 'flex-end', paddingBottom: 10 }}>
          {isRequester ? (
            <Button
              mode="contained"
              icon="check"
              buttonColor="#2E7D32"
              onPress={() => onAccept?.(offer._id)}
            >
              Accept This Offer
            </Button>
          ) : (
            <Button
              mode="text"
              textColor="#D32F2F"
              onPress={() => onWithdraw?.(offer._id)}
            >
              Withdraw Offer
            </Button>
          )}
        </Card.Actions>
      )}
    </Card>
  );
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerItemName, setOfferItemName] = useState('');
  const [offerCondition, setOfferCondition] = useState<ItemCondition>('GOOD');
  const [offerHourly, setOfferHourly] = useState('');
  const [offerDaily, setOfferDaily] = useState('');
  const [offerDeposit, setOfferDeposit] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [isOfferSubmitting, setIsOfferSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['request-detail', id],
    queryFn: () => getItemRequestById(id!),
    enabled: !!id,
  });

  const { data: myItems = [] } = useQuery({
    queryKey: ['my-rentals'],
    queryFn: getMyRentalItems,
  });

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => acceptItemOffer(id!, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['item-requests-society'] });
      queryClient.invalidateQueries({ queryKey: ['item-requests-mine'] });
      Alert.alert(
        'Offer Accepted!',
        "Great! The lender has been notified. They'll contact you to arrange the handover.",
      );
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept offer');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (offerId: string) => withdrawItemOffer(id!, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-detail', id] });
      Alert.alert('Withdrawn', 'Your offer has been withdrawn.');
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to withdraw offer');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelItemRequest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-requests-mine'] });
      router.replace('/(app)/rentals/requests' as never);
    },
  });

  const handleMakeOffer = async () => {
    if (!offerItemName.trim()) {
      Alert.alert('Required', 'Please enter the item name.');
      return;
    }
    const hourly = offerHourly ? Math.round(parseFloat(offerHourly) * 100) : undefined;
    const daily = offerDaily ? Math.round(parseFloat(offerDaily) * 100) : undefined;
    const deposit = offerDeposit ? Math.round(parseFloat(offerDeposit) * 100) : 0;

    if (!hourly && !daily) {
      Alert.alert('Required', 'Please enter at least an hourly or daily rate.');
      return;
    }

    const payload: CreateItemOfferPayload = {
      itemName: offerItemName.trim(),
      condition: offerCondition,
      chargeHourlyPaise: hourly,
      chargeDailyPaise: daily,
      safeDepositPaise: deposit,
      message: offerMessage.trim() || undefined,
      photos: [],
    };

    try {
      setIsOfferSubmitting(true);
      await makeItemOffer(id!, payload);
      setOfferModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['request-detail', id] });
      Alert.alert(
        'Offer Sent!',
        'Your offer has been submitted. The requester will be notified and can accept your offer.',
      );
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit offer');
    } finally {
      setIsOfferSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { request, offers, isRequester } = data;
  const flatNumber =
    typeof request.flatId === 'object' && request.flatId ? request.flatId.number : '—';

  const myExistingOffer = !isRequester
    ? offers.find((o) => {
        const oid =
          typeof o.offeredById === 'object' && o.offeredById
            ? o.offeredById._id
            : o.offeredById;
        return String(oid) === user?.userId && o.status === 'PENDING';
      })
    : null;

  const CONDITIONS: { value: ItemCondition; label: string }[] = [
    { value: 'LIKE_NEW', label: 'Like New' },
    { value: 'GOOD', label: 'Good' },
    { value: 'FAIR', label: 'Fair' },
    { value: 'HEAVILY_USED', label: 'Used' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Request Details */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.reqHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={styles.reqTitle}>
                  {request.itemName}
                </Text>
                <Text variant="bodySmall" style={{ color: '#757575', marginTop: 2 }}>
                  Flat {flatNumber} · {request.category.toUpperCase()}
                </Text>
              </View>
              <Chip
                compact
                style={{
                  backgroundColor: request.status === 'OPEN' ? '#E3F2FD' : '#F5F5F5',
                }}
              >
                {request.status}
              </Chip>
            </View>

            {request.purpose ? (
              <Text variant="bodyMedium" style={styles.purposeBox}>
                <Text style={{ fontWeight: '600' }}>Purpose: </Text>
                {request.purpose}
              </Text>
            ) : null}

            <Divider style={{ marginVertical: 10 }} />

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text variant="labelSmall" style={styles.detailLabel}>
                  Duration
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {request.durationValue} {request.durationType.toLowerCase()}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="labelSmall" style={styles.detailLabel}>
                  Needed From
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {formatDate(request.neededFrom)}
                </Text>
              </View>
              {request.budgetPaise ? (
                <View style={styles.detailItem}>
                  <Text variant="labelSmall" style={styles.detailLabel}>
                    Budget
                  </Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>
                    ₹{(request.budgetPaise / 100).toFixed(0)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.detailItem}>
                <Text variant="labelSmall" style={styles.detailLabel}>
                  Offers Received
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {request.offersCount}
                </Text>
              </View>
            </View>
          </Card.Content>

          {isRequester && request.status === 'OPEN' && (
            <Card.Actions>
              <Button
                textColor="#D32F2F"
                onPress={() =>
                  Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
                  ])
                }
              >
                Cancel Request
              </Button>
            </Card.Actions>
          )}
        </Card>

        {/* Offers Section */}
        <View style={styles.offersSection}>
          <Text variant="titleMedium" style={styles.offersTitle}>
            {isRequester
              ? `Offers Received (${offers.length})`
              : myExistingOffer
              ? 'Your Offer'
              : request.status === 'OPEN'
              ? 'Make an Offer'
              : 'Request Closed'}
          </Text>

          {/* CTA for neighbours who haven't offered yet */}
          {!isRequester && !myExistingOffer && request.status === 'OPEN' && (
            <Card style={[styles.card, { backgroundColor: '#E3F2FD' }]} mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: '#1565C0', fontWeight: '600' }}>
                  Do you have a "{request.itemName}" to lend?
                </Text>
                <Text variant="bodySmall" style={{ color: '#1976D2', marginTop: 4 }}>
                  Set your price, deposit, and a quick note — the requester will review all offers.
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  icon="handshake"
                  onPress={() => setOfferModalVisible(true)}
                >
                  I Have It – Make Offer
                </Button>
              </Card.Actions>
            </Card>
          )}

          {/* Offer cards */}
          {offers.map((offer) => (
            <OfferCard
              key={offer._id}
              offer={offer}
              isRequester={isRequester}
              onAccept={(offerId) =>
                Alert.alert('Accept Offer', 'Accept this offer? The request will close.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Accept', onPress: () => acceptMutation.mutate(offerId) },
                ])
              }
              onWithdraw={(offerId) =>
                Alert.alert('Withdraw Offer', 'Withdraw your offer for this request?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate(offerId) },
                ])
              }
            />
          ))}

          {isRequester && offers.length === 0 && (
            <Card style={styles.card} mode="outlined">
              <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <IconButton icon="timer-sand" size={40} iconColor="#BDBDBD" />
                <Text variant="bodyMedium" style={{ color: '#9E9E9E', textAlign: 'center' }}>
                  No offers yet. Neighbours have been notified and may respond soon.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Make Offer Modal */}
      <Modal
        visible={offerModalVisible}
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: '700' }}>
              Your Offer
            </Text>
            <IconButton icon="close" onPress={() => setOfferModalVisible(false)} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text variant="bodyMedium" style={styles.modalSub}>
              Offering to lend for "{request.itemName}" request · {request.durationValue} {request.durationType.toLowerCase()}
            </Text>

            {/* Quick pick from existing items */}
            {myItems.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text variant="bodySmall" style={styles.fieldLabel}>
                  Pick from your listed items (or fill manually below):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {myItems
                    .filter((i) => i.status === 'PUBLISHED' && i.isAvailable)
                    .map((item) => (
                      <Chip
                        key={item._id}
                        onPress={() => {
                          setOfferItemName(item.name);
                          setOfferCondition(item.condition);
                          if (item.chargeHourlyPaise) setOfferHourly(String(item.chargeHourlyPaise / 100));
                          if (item.chargeDailyPaise) setOfferDaily(String(item.chargeDailyPaise / 100));
                          setOfferDeposit(String(item.safeDepositPaise / 100));
                        }}
                        style={{ backgroundColor: '#E8F5E9' }}
                      >
                        {item.name}
                      </Chip>
                    ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              label="Item Name *"
              value={offerItemName}
              onChangeText={setOfferItemName}
              mode="outlined"
              style={styles.modalInput}
            />

            <Text variant="bodySmall" style={styles.fieldLabel}>Condition:</Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.map((c) => (
                <Chip
                  key={c.value}
                  selected={offerCondition === c.value}
                  onPress={() => setOfferCondition(c.value)}
                  compact
                  style={{ backgroundColor: offerCondition === c.value ? '#E3F2FD' : '#F5F5F5' }}
                >
                  {c.label}
                </Chip>
              ))}
            </View>

            <View style={styles.row}>
              <TextInput
                label="Charge / Hour (₹)"
                value={offerHourly}
                onChangeText={setOfferHourly}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, styles.half]}
              />
              <TextInput
                label="Charge / Day (₹)"
                value={offerDaily}
                onChangeText={setOfferDaily}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, styles.half]}
              />
            </View>
            <HelperText type="info">At least one rate required.</HelperText>

            <TextInput
              label="Refundable Safe Deposit (₹) *"
              value={offerDeposit}
              onChangeText={setOfferDeposit}
              keyboardType="numeric"
              mode="outlined"
              style={styles.modalInput}
            />

            <TextInput
              label="Note to requester (optional)"
              value={offerMessage}
              onChangeText={setOfferMessage}
              placeholder="e.g. Available from 10am, good working condition, indoor use only"
              multiline
              numberOfLines={2}
              mode="outlined"
              style={styles.modalInput}
            />

            <Button
              mode="contained"
              icon="send"
              loading={isOfferSubmitting}
              disabled={isOfferSubmitting}
              onPress={handleMakeOffer}
              style={{ marginTop: 12, borderRadius: 8 }}
              contentStyle={{ height: 48 }}
            >
              Submit Offer
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  reqTitle: { fontWeight: '700', color: '#212121' },
  purposeBox: { backgroundColor: '#FFF8E1', padding: 10, borderRadius: 8, marginTop: 8, color: '#424242' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '45%' },
  detailLabel: { color: '#9E9E9E', fontWeight: '700', marginBottom: 2 },
  detailValue: { fontWeight: '600', color: '#212121' },
  offersSection: { gap: 10 },
  offersTitle: { fontWeight: '700', color: '#1565C0' },
  offerCard: { borderRadius: 10, backgroundColor: '#FFFFFF', marginBottom: 2 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  offerMessage: { color: '#616161', fontStyle: 'italic', marginTop: 6 },
  offerRates: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  aiNote: { backgroundColor: '#F9FBE7', padding: 8, borderRadius: 6, marginTop: 8 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalSub: { color: '#757575', marginBottom: 12 },
  modalContent: { padding: 16, gap: 8, paddingBottom: 40 },
  modalInput: { backgroundColor: '#FFFFFF' },
  fieldLabel: { color: '#616161', fontWeight: '600', marginBottom: 4 },
  conditionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
