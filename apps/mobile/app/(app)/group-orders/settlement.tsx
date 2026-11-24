import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
  TextInput,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupOrder } from '../../../src/services/group-orders';
import { getCommitmentSummary } from '../../../src/services/commitments';
import {
  listIssues,
  presidentResolveIssue,
  settleOrderEscrow,
  type GroupBuyIssue,
} from '../../../src/services/disputes';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function PresidentSettlementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeIssue, setActiveIssue] = useState<GroupBuyIssue | null>(null);
  const [decision, setDecision] = useState<'REFUND' | 'REPLACEMENT' | 'DISMISS'>('REFUND');
  const [note, setNote] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const { data: commitmentsData, isLoading: isCommLoading } = useQuery({
    queryKey: ['commitments-summary', id],
    queryFn: () => getCommitmentSummary(id),
    enabled: !!id,
  });

  const { data: issuesData, isLoading: isIssuesLoading } = useQuery({
    queryKey: ['order-issues', id],
    queryFn: () => listIssues(id),
    enabled: !!id,
  });

  const order = orderData?.order;
  const summary = commitmentsData;
  const issues = issuesData?.issues ?? [];

  const resolveMutation = useMutation({
    mutationFn: () =>
      presidentResolveIssue(id, activeIssue!._id, {
        decision,
        note,
      }),
    onSuccess: () => {
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order-issues', id] });
      queryClient.invalidateQueries({ queryKey: ['commitments-summary', id] });
      Alert.alert('Ruling Issued', 'Presidential ruling applied to dispute.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to apply ruling');
    },
  });

  const settleMutation = useMutation({
    mutationFn: () => settleOrderEscrow(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['commitments-summary', id] });
      Alert.alert(
        'Settlement Complete!',
        `Released ${formatPaise(data.netPayoutPaise)} to supplier escrow. Order is now COMPLETED.`,
      );
    },
    onError: (err: any) => {
      Alert.alert('Settlement Error', err.response?.data?.message ?? err.message ?? 'Failed to settle');
    },
  });

  if (isOrderLoading || isCommLoading || isIssuesLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading settlement calculations...</Text>
      </SafeAreaView>
    );
  }

  if (!order || !summary) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Failed to load order data.</Text>
      </SafeAreaView>
    );
  }

  const totalPaidPaise = summary.totalPaidPaise;
  const refundedIssues = issues.filter((i) => i.status === 'RESOLVED_REFUND');
  const totalRefundedPaise = refundedIssues.reduce((sum, i) => sum + i.refundAmountPaise, 0);
  const netSupplierPayoutPaise = Math.max(0, totalPaidPaise - totalRefundedPaise);

  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'ESCALATED');
  const isSettled = order.status === 'COMPLETED';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text variant="titleMedium" style={styles.title}>
                Settlement: {order.productName}
              </Text>
              <Chip
                style={{ backgroundColor: isSettled ? '#E8F5E9' : '#E3F2FD' }}
                textStyle={{ color: isSettled ? '#2E7D32' : '#1565C0', fontWeight: 'bold' }}
              >
                {order.status}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Total Resident Escrow Held:</Text>
              <Text style={styles.value}>{formatPaise(totalPaidPaise)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Resolved Item Refunds:</Text>
              <Text style={[styles.value, { color: '#C62828' }]}>
                - {formatPaise(totalRefundedPaise)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                Net Payout to Supplier:
              </Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1B5E20' }}>
                {formatPaise(netSupplierPayoutPaise)}
              </Text>
            </View>

            {!isSettled && (
              <Button
                mode="contained"
                style={styles.settleBtn}
                loading={settleMutation.isPending}
                disabled={settleMutation.isPending || openIssues.length > 0}
                onPress={() => {
                  Alert.alert(
                    'Confirm Escrow Release',
                    `This will release ${formatPaise(netSupplierPayoutPaise)} to the supplier and mark the order COMPLETED. Proceed?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Release Payout', onPress: () => settleMutation.mutate() },
                    ],
                  );
                }}
              >
                {openIssues.length > 0
                  ? `Resolve ${openIssues.length} Dispute(s) First`
                  : 'Release Escrow Payout to Supplier'}
              </Button>
            )}

            {isSettled && (
              <Text style={[styles.subtext, { textAlign: 'center', marginTop: 12, color: '#2E7D32' }]}>
                ✓ Order has been fully settled and finalized.
              </Text>
            )}
          </Card.Content>
        </Card>

        {}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Disputes & Issues ({issues.length})
        </Text>

        {issues.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.subtext, { textAlign: 'center' }]}>
                No disputes reported for this order. Clean delivery!
              </Text>
            </Card.Content>
          </Card>
        ) : (
          issues.map((iss) => (
            <Card key={iss._id} style={styles.issueCard}>
              <Card.Content>
                <View style={styles.row}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                    Flat {iss.flatLabel} ({iss.residentName})
                  </Text>
                  <Chip style={{ height: 26 }} textStyle={{ fontSize: 11, fontWeight: 'bold' }}>
                    {iss.status}
                  </Chip>
                </View>

                <Text style={styles.subtext}>
                  {iss.issueType.replace('_', ' ')} • Claim: {formatPaise(iss.refundAmountPaise)}
                </Text>
                <Text style={[styles.subtext, { marginTop: 4, fontStyle: 'italic' }]}>
                  "{iss.description}"
                </Text>

                {iss.status === 'ESCALATED' && (
                  <Button
                    mode="contained"
                    style={styles.ruleBtn}
                    onPress={() => {
                      setActiveIssue(iss);
                      setDecision('REFUND');
                      setNote('President approved refund after reviewing dispute proof');
                      setModalVisible(true);
                    }}
                  >
                    Issue Presidential Ruling
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            President Ruling: Flat {activeIssue?.flatLabel}
          </Text>
          <Text style={[styles.subtext, { marginBottom: 12 }]}>
            Claim amount: {formatPaise(activeIssue?.refundAmountPaise ?? 0)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            <Button
              mode={decision === 'REFUND' ? 'contained' : 'outlined'}
              onPress={() => setDecision('REFUND')}
            >
              Refund
            </Button>
            <Button
              mode={decision === 'REPLACEMENT' ? 'contained' : 'outlined'}
              onPress={() => setDecision('REPLACEMENT')}
            >
              Replace
            </Button>
            <Button
              mode={decision === 'DISMISS' ? 'contained' : 'outlined'}
              onPress={() => setDecision('DISMISS')}
            >
              Dismiss
            </Button>
          </View>
          <TextInput
            label="President Note / Reason"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={resolveMutation.isPending}
              onPress={() => resolveMutation.mutate()}
            >
              Apply Binding Ruling
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', marginBottom: 16 },
  issueCard: { backgroundColor: '#FFFFFF', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  label: { color: '#666666' },
  value: { fontWeight: 'bold' },
  subtext: { color: '#666666', fontSize: 13 },
  sectionHeader: { fontWeight: 'bold', marginVertical: 12, color: '#333333' },
  settleBtn: { backgroundColor: '#1B5E20', marginTop: 16 },
  ruleBtn: { backgroundColor: '#512DA8', marginTop: 8 },
  errorText: { color: '#C62828', fontSize: 16 },
  modalContent: { backgroundColor: '#FFFFFF', padding: 24, margin: 20, borderRadius: 8 },
});
