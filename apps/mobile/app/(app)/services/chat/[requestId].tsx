import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Chip, IconButton, Dialog, Portal, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMessages, sendMessage, sendPriceOffer, respondToPriceOffer } from '../../../../src/services/service-hub-chat';
import { getRequest } from '../../../../src/services/service-hub-requests';
import { useAuthStore } from '../../../../src/store/auth';

export default function ServiceChatScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [text, setText] = useState('');
  const [offerDialogVisible, setOfferDialogVisible] = useState(false);
  const [offerAmountRs, setOfferAmountRs] = useState('500');
  const [billingUnit, setBillingUnit] = useState<'HOURLY' | 'DAILY' | 'MONTHLY' | 'FIXED'>('FIXED');
  const [paymentWindowType, setPaymentWindowType] = useState<'SAME_DAY_HOURS' | 'DAYS_AFTER_JOB' | 'MONTHLY_DATE_RANGE'>('SAME_DAY_HOURS');
  const [sameDayFrom, setSameDayFrom] = useState('12:00');
  const [sameDayTo, setSameDayTo] = useState('13:00');
  const [noticePeriod, setNoticePeriod] = useState('7');

  const flatListRef = useRef<FlatList>(null);

  const { data: request } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: async () => {
      const res = await getRequest(requestId);
      return res.data;
    },
    enabled: !!requestId,
  });

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['service-chat', requestId],
    queryFn: async () => {
      const res = await getMessages(requestId);
      return res.data ?? [];
    },
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  const sendMsgMutation = useMutation({
    mutationFn: async () => {
      if (!text.trim()) return;
      return sendMessage(requestId, text.trim());
    },
    onSuccess: () => {
      setText('');
      refetch();
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: async () => {
      const amountPaise = Math.round(parseFloat(offerAmountRs) * 100);
      const paymentWindow: any = { type: paymentWindowType };
      if (paymentWindowType === 'SAME_DAY_HOURS') {
        paymentWindow.sameDayHours = { from: sameDayFrom, to: sameDayTo };
      } else if (paymentWindowType === 'DAYS_AFTER_JOB') {
        paymentWindow.daysAfterJob = 2;
      } else {
        paymentWindow.monthlyDateRange = { fromDay: 1, toDay: 5 };
      }

      return sendPriceOffer(requestId, {
        amountPaise,
        billingUnit,
        paymentWindow,
        noticePeriodDays: parseInt(noticePeriod, 10) || 7,
      });
    },
    onSuccess: () => {
      setOfferDialogVisible(false);
      refetch();
    },
  });

  const respondOfferMutation = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: 'ACCEPT' | 'DECLINE' }) => {
      return respondToPriceOffer(requestId, offerId, action);
    },
    onSuccess: (_, vars) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      if (vars.action === 'ACCEPT') {
        Alert.alert(
          'Agreement Locked!',
          'Both parties agreed on terms. The Service Agreement is now locked and payment window is scheduled.',
        );
      }
    },
  });

  const isSeeker = request?.seekerId?.toString() === currentUser?.userId;
  const isProvider = request?.providerUserId?.toString() === currentUser?.userId;
  const isAgreementLocked = request?.status === 'AGREED' || request?.status === 'ACTIVE';

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'SYSTEM') {
      return (
        <View style={styles.systemMsgWrap}>
          <Text variant="labelSmall" style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const isMe = item.senderId?.toString() === currentUser?.userId;

    if (item.type === 'PRICE_OFFER' && item.priceOffer) {
      const offer = item.priceOffer;
      const amountRs = (offer.amountPaise / 100).toFixed(0);
      const isPending = offer.status === 'PENDING';

      return (
        <View style={[styles.offerMsgContainer, isMe ? styles.myMsg : styles.theirMsg]}>
          <Card style={styles.offerCard} mode="elevated">
            <Card.Content style={{ gap: 6 }}>
              <View style={styles.offerHeader}>
                <Chip icon="tag" style={{ backgroundColor: '#E8F5E9' }}>
                  Price Offer: ₹{amountRs} / {offer.billingUnit?.toLowerCase()}
                </Chip>
                <Chip compact style={{ backgroundColor: offer.status === 'ACCEPTED' ? '#C8E6C9' : '#ECEFF1' }}>
                  {offer.status}
                </Chip>
              </View>

              <Text variant="bodySmall" style={{ color: '#455A64' }}>
                Payment Window: {offer.paymentWindow?.type === 'SAME_DAY_HOURS'
                  ? `Same day between ${offer.paymentWindow.sameDayHours?.from} - ${offer.paymentWindow.sameDayHours?.to}`
                  : offer.paymentWindow?.type === 'MONTHLY_DATE_RANGE'
                  ? `1st to 5th of each month`
                  : `Within 2 days of completion`}
              </Text>
              <Text variant="labelSmall" style={{ color: '#78909C' }}>
                Notice period: {offer.noticePeriodDays || 7} days
              </Text>

              {}
              {!isMe && isPending && (
                <View style={styles.offerActions}>
                  <Button
                    mode="contained"
                    buttonColor="#2E7D32"
                    compact
                    onPress={() => respondOfferMutation.mutate({ offerId: item._id, action: 'ACCEPT' })}
                  >
                    Accept Offer (Locks Agreement)
                  </Button>
                  <Button
                    mode="outlined"
                    textColor="#D32F2F"
                    compact
                    onPress={() => respondOfferMutation.mutate({ offerId: item._id, action: 'DECLINE' })}
                  >
                    Decline
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>
      );
    }

    return (
      <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.msgText, isMe ? styles.myText : styles.theirText]}>{item.text}</Text>
        <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {}
      {isAgreementLocked && (
        <Card style={styles.lockedBanner} mode="contained">
          <Card.Content style={styles.lockedContent}>
            <Text variant="labelMedium" style={{ color: '#1B5E20', fontWeight: '700' }}>
              🔒 Terms Locked into Service Agreement
            </Text>
            {request?.agreedAgreementId && (
              <Button
                mode="text"
                compact
                textColor="#1B5E20"
                onPress={() =>
                  router.push(`/(app)/services/agreements/${request.agreedAgreementId}` as never)
                }
              >
                View Agreement
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {}
      <View style={styles.topInfo}>
        <Text variant="labelSmall" style={{ color: '#546E7A' }}>
          📞 Phone numbers unlocked for negotiation. Be polite and agree on scope & payment timing.
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {}
      <View style={styles.inputContainer}>
        {}
        <Button
          mode="outlined"
          compact
          icon="tag"
          onPress={() => setOfferDialogVisible(true)}
          style={{ marginRight: 6 }}
        >
          Offer
        </Button>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type message..."
          style={styles.input}
          mode="outlined"
          dense
          onSubmitEditing={() => sendMsgMutation.mutate()}
        />

        <IconButton
          icon="send"
          mode="contained"
          size={20}
          onPress={() => sendMsgMutation.mutate()}
          disabled={!text.trim() || sendMsgMutation.isPending}
        />
      </View>

      {}
      <Portal>
        <Dialog visible={offerDialogVisible} onDismiss={() => setOfferDialogVisible(false)}>
          <Dialog.Title>Send Price & Terms Offer</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Price Amount (₹)"
              value={offerAmountRs}
              onChangeText={setOfferAmountRs}
              keyboardType="numeric"
              mode="outlined"
              left={<TextInput.Affix text="₹" />}
            />

            <Text variant="labelMedium">Billing Unit</Text>
            <SegmentedButtons
              value={billingUnit}
              onValueChange={(v) => setBillingUnit(v as any)}
              buttons={[
                { value: 'HOURLY', label: '/hr' },
                { value: 'DAILY', label: '/day' },
                { value: 'MONTHLY', label: '/mo' },
                { value: 'FIXED', label: 'Job' },
              ]}
            />

            <Text variant="labelMedium">Expected Payment Window</Text>
            <SegmentedButtons
              value={paymentWindowType}
              onValueChange={(v) => setPaymentWindowType(v as any)}
              buttons={[
                { value: 'SAME_DAY_HOURS', label: 'Same Day' },
                { value: 'DAYS_AFTER_JOB', label: '+2 Days' },
                { value: 'MONTHLY_DATE_RANGE', label: '1-5th' },
              ]}
            />

            {paymentWindowType === 'SAME_DAY_HOURS' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  label="From"
                  value={sameDayFrom}
                  onChangeText={setSameDayFrom}
                  style={{ flex: 1 }}
                  mode="outlined"
                />
                <TextInput
                  label="To"
                  value={sameDayTo}
                  onChangeText={setSameDayTo}
                  style={{ flex: 1 }}
                  mode="outlined"
                />
              </View>
            )}

            <TextInput
              label="Notice Period (Days, default 7)"
              value={noticePeriod}
              onChangeText={setNoticePeriod}
              keyboardType="numeric"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOfferDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={sendOfferMutation.isPending}
              onPress={() => sendOfferMutation.mutate()}
            >
              Send Offer Card
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  lockedBanner: { backgroundColor: '#E8F5E9', borderRadius: 0 },
  lockedContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  topInfo: { padding: 8, backgroundColor: '#E8EAF6', alignItems: 'center' },
  listContent: { padding: 12, gap: 10 },
  systemMsgWrap: { alignSelf: 'center', backgroundColor: '#E0E0E0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: 6 },
  systemMsgText: { color: '#616161', fontStyle: 'italic' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginVertical: 2 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#1565C0', borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderBottomLeftRadius: 2, elevation: 1 },
  msgText: { fontSize: 14 },
  myText: { color: '#ffffff' },
  theirText: { color: '#212121' },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  myTimeText: { color: '#BBDEFB' },
  theirTimeText: { color: '#9E9E9E' },
  offerMsgContainer: { width: '92%', marginVertical: 6 },
  myMsg: { alignSelf: 'flex-end' },
  theirMsg: { alignSelf: 'flex-start' },
  offerCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#81C784' },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  input: { flex: 1, backgroundColor: '#ffffff' },
});
