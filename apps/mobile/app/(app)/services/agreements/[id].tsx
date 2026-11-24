import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider, TextInput, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgreement, proposeRevision, respondToRevision, terminateAgreement } from '../../../../src/services/service-hub-agreements';
import { useAuthStore } from '../../../../src/store/auth';

const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ServiceAgreementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [revisionVisible, setRevisionVisible] = useState(false);
  const [newPriceRs, setNewPriceRs] = useState('');
  const [revisionReason, setRevisionReason] = useState('');

  const [terminateVisible, setTerminateVisible] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  const { data: agreement, isLoading } = useQuery({
    queryKey: ['service-agreement', id],
    queryFn: async () => {
      const res = await getAgreement(id);
      return res.data;
    },
    enabled: !!id,
  });

  const proposeMutation = useMutation({
    mutationFn: async () => {
      const paise = Math.round(parseFloat(newPriceRs) * 100);
      return proposeRevision(id, paise, revisionReason);
    },
    onSuccess: () => {
      setRevisionVisible(false);
      queryClient.invalidateQueries({ queryKey: ['service-agreement', id] });
      Alert.alert('Revision Proposed', 'The other party will be notified to accept or reject the revised terms.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  const respondRevisionMutation = useMutation({
    mutationFn: async (action: 'ACCEPT' | 'REJECT') => {
      return respondToRevision(id, action);
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['service-agreement', id] });
      Alert.alert('Revision Responded', `You ${action.toLowerCase()}ed the proposed revision.`);
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      return terminateAgreement(id, terminateReason);
    },
    onSuccess: () => {
      setTerminateVisible(false);
      queryClient.invalidateQueries({ queryKey: ['service-agreement', id] });
      Alert.alert('Terminated', 'The agreement has been marked for termination with notice period.');
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (!agreement) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Agreement not found</Text>
      </View>
    );
  }

  const isSeeker = agreement.seekerId?.toString() === currentUser?.userId;
  const isProvider = agreement.providerUserId?.toString() === currentUser?.userId;

  const priceRs = (agreement.pricePaise / 100).toFixed(0);
  const scheduleDays = agreement.schedule?.daysOfWeek?.map((d: number) => DAYS_MAP[d]).join(', ');

  const pw = agreement.paymentWindow;
  const paymentWindowDesc =
    pw?.type === 'SAME_DAY_HOURS'
      ? `Same Day: ${pw.sameDayHours?.from} - ${pw.sameDayHours?.to}`
      : pw?.type === 'MONTHLY_DATE_RANGE'
      ? `Monthly: ${pw.monthlyDateRange?.fromDay}th to ${pw.monthlyDateRange?.toDay}th`
      : `Within ${pw?.daysAfterJob ?? 2} days of completion`;

  const pendingRevision = agreement.revisionProposal;
  const isProposer = pendingRevision?.proposedBy?.toString() === currentUser?.userId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <Card style={styles.statusCard} mode="elevated">
        <Card.Content>
          <View style={styles.statusRow}>
            <Text variant="titleMedium" style={styles.agreementTitle}>SERVICE AGREEMENT</Text>
            <Chip compact style={styles.statusChip}>
              {agreement.status}
            </Chip>
          </View>
          <Text variant="bodySmall" style={{ color: '#37474F', marginTop: 4 }}>
            Binding terms agreed between Seeker (Flat {agreement.seekerFlatCode}) and Provider.
          </Text>
        </Card.Content>
      </Card>

      {/* Pending Revision Alert */}
      {pendingRevision && pendingRevision.status === 'PENDING' && (
        <Card style={styles.revisionCard} mode="elevated">
          <Card.Content style={{ gap: 6 }}>
            <Text variant="titleSmall" style={{ color: '#E65100', fontWeight: '700' }}>
              ⚠️ Proposed Terms Revision
            </Text>
            <Text variant="bodyMedium">
              New Price Proposed: ₹{(pendingRevision.newPricePaise / 100).toFixed(0)}
            </Text>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Reason: {pendingRevision.reason}
            </Text>

            {!isProposer && (
              <View style={styles.revisionBtnRow}>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  compact
                  onPress={() => respondRevisionMutation.mutate('ACCEPT')}
                >
                  Accept New Price
                </Button>
                <Button
                  mode="outlined"
                  textColor="#D32F2F"
                  compact
                  onPress={() => respondRevisionMutation.mutate('REJECT')}
                >
                  Reject
                </Button>
              </View>
            )}
            {isProposer && (
              <Text variant="labelSmall" style={{ color: '#78909C' }}>
                Waiting for the other party to approve your revision request.
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Terms Box */}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Locked Terms" />
        <Card.Content style={{ gap: 10 }}>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Agreed Price:</Text>
            <Text variant="titleMedium" style={styles.priceHighlight}>
              ₹{priceRs} / {agreement.billingUnit?.toLowerCase()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Payment Window:</Text>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#1565C0' }}>
              {paymentWindowDesc}
            </Text>
          </View>

          <Divider />

          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Schedule Slot:</Text>
            <Text variant="bodyMedium">
              {agreement.schedule?.dailyTimeSlot?.from} - {agreement.schedule?.dailyTimeSlot?.to}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Days of Week:</Text>
            <Text variant="bodyMedium">{scheduleDays}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Work Duration:</Text>
            <Text variant="bodyMedium">
              {new Date(agreement.schedule?.startDate).toDateString()}
              {agreement.schedule?.isOngoing
                ? ' (Ongoing Monthly)'
                : agreement.schedule?.endDate
                ? ` to ${new Date(agreement.schedule.endDate).toDateString()}`
                : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Notice Period:</Text>
            <Text variant="bodyMedium">{agreement.noticePeriodDays || 7} days</Text>
          </View>

          <Divider />

          <Text variant="labelMedium" style={styles.detailKey}>Requirements / Scope:</Text>
          <Text variant="bodyMedium" style={{ color: '#424242' }}>
            {agreement.requirementsSummary}
          </Text>
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={{ gap: 10, marginTop: 4 }}>
        <Button
          mode="contained"
          icon="credit-card"
          buttonColor="#1565C0"
          onPress={() => router.push('/(app)/services/payments' as never)}
        >
          View Payments & Pay
        </Button>

        {agreement.status === 'LOCKED' && (
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => setRevisionVisible(true)}
          >
            Propose Terms Revision
          </Button>
        )}

        {agreement.status !== 'TERMINATED' && agreement.status !== 'COMPLETED' && (
          <Button
            mode="text"
            textColor="#D32F2F"
            icon="cancel"
            onPress={() => setTerminateVisible(true)}
          >
            End / Terminate Agreement ({agreement.noticePeriodDays || 7} Days Notice)
          </Button>
        )}
      </View>

      {/* Propose Revision Dialog */}
      <Portal>
        <Dialog visible={revisionVisible} onDismiss={() => setRevisionVisible(false)}>
          <Dialog.Title>Propose Price Revision</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="bodySmall">
              Both seeker and provider must agree before the revision takes effect.
            </Text>
            <TextInput
              label="New Price (₹)"
              value={newPriceRs}
              onChangeText={setNewPriceRs}
              keyboardType="numeric"
              mode="outlined"
              left={<TextInput.Affix text="₹" />}
            />
            <TextInput
              label="Reason for Revision"
              value={revisionReason}
              onChangeText={setRevisionReason}
              mode="outlined"
              placeholder="e.g. Scope increase, additional room, schedule change..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRevisionVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={proposeMutation.isPending}
              disabled={!newPriceRs || !revisionReason}
              onPress={() => proposeMutation.mutate()}
            >
              Submit Proposal
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Terminate Dialog */}
        <Dialog visible={terminateVisible} onDismiss={() => setTerminateVisible(false)}>
          <Dialog.Title>Terminate Agreement</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#D32F2F' }}>
              Notice period of {agreement.noticePeriodDays || 7} days will apply before services formally end.
            </Text>
            <TextInput
              label="Reason for Termination"
              value={terminateReason}
              onChangeText={setTerminateReason}
              mode="outlined"
              placeholder="e.g. Moving out, schedule conflict, requirements ended..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTerminateVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#D32F2F"
              loading={terminateMutation.isPending}
              disabled={!terminateReason}
              onPress={() => terminateMutation.mutate()}
            >
              Confirm Termination
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard: { backgroundColor: '#E8EAF6', borderRadius: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agreementTitle: { fontWeight: '700', color: '#1A237E' },
  statusChip: { backgroundColor: '#C5CAE9' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  revisionCard: { backgroundColor: '#FFF3E0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE082' },
  revisionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { color: '#616161', fontWeight: '500' },
  priceHighlight: { fontWeight: '700', color: '#1B5E20' },
});
