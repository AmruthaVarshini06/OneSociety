import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, SegmentedButtons, Dialog, Portal, TextInput, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSeekerPayments, recordPayment } from '../../../../src/services/service-hub-payments';

export default function SeekerPaymentsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'OVERDUE'>('ALL');

  const [payDialogVisible, setPayDialogVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'IN_APP' | 'CASH' | 'UPI_OFFLINE'>('IN_APP');
  const [offlineRef, setOfflineRef] = useState('');

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['seeker-payments'],
    queryFn: async () => {
      const res = await getSeekerPayments();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayment) return;
      return recordPayment(selectedPayment._id, selectedPayment.amountPaise, paymentMode, offlineRef);
    },
    onSuccess: () => {
      setPayDialogVisible(false);
      setOfflineRef('');
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['seeker-payments'] });
      Alert.alert(
        'Payment Recorded',
        paymentMode === 'IN_APP'
          ? 'Payment successful and confirmed in-app.'
          : 'Payment recorded. The provider has been notified to confirm receipt.',
      );
    },
    onError: (err: any) => {
      Alert.alert('Payment Error', err.response?.data?.message || err.message);
    },
  });

  const filtered = payments.filter((p: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return p.status === 'PENDING' || p.status === 'PAID_PENDING_CONFIRMATION';
    return p.status === filter;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Service Payments</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Pay providers strictly within their specified expected payment window
        </Text>
      </View>

      <SegmentedButtons
        value={filter}
        onValueChange={(v) => setFilter(v as any)}
        buttons={[
          { value: 'ALL', label: 'All' },
          { value: 'PENDING', label: 'Due / Pending' },
          { value: 'CONFIRMED', label: 'Paid' },
          { value: 'OVERDUE', label: 'Overdue' },
        ]}
        style={styles.seg}
      />

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 20 }} />}

      {!isLoading && filtered.length === 0 && (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text variant="bodyMedium" style={{ color: '#757575' }}>No payments found in this category.</Text>
          </Card.Content>
        </Card>
      )}

      {filtered.map((p: any) => {
        const isOverdue = p.status === 'OVERDUE';
        const isPending = p.status === 'PENDING';
        const isWaitingConfirm = p.status === 'PAID_PENDING_CONFIRMATION';
        const isConfirmed = p.status === 'CONFIRMED';
        const amountRs = (p.amountPaise / 100).toFixed(0);

        return (
          <Card key={p._id} style={[styles.card, isOverdue && styles.overdueCard]} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.amountText}>₹{amountRs}</Text>
                <Chip
                  compact
                  style={[
                    styles.statusChip,
                    isConfirmed && { backgroundColor: '#C8E6C9' },
                    isOverdue && { backgroundColor: '#FFCDD2' },
                    isPending && { backgroundColor: '#FFF9C4' },
                    isWaitingConfirm && { backgroundColor: '#E1F5FE' },
                  ]}
                >
                  {p.status.replace(/_/g, ' ')}
                </Chip>
              </View>

              {p.cycleMonth && (
                <Text variant="labelSmall" style={{ color: '#616161' }}>
                  Billing Cycle: {p.cycleMonth}
                </Text>
              )}

              <View style={styles.windowBox}>
                <Text variant="labelSmall" style={styles.windowLabel}>Expected Payment Window:</Text>
                <Text variant="bodySmall" style={styles.windowValue}>
                  {new Date(p.windowStart).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  {'  →  '}
                  {new Date(p.windowEnd).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
              </View>

              {isOverdue && (
                <Text variant="labelSmall" style={styles.overdueAlert}>
                  ⚠️ Payment window has expired. Society President is notified for persistent overdue payments.
                </Text>
              )}

              {isWaitingConfirm && (
                <Text variant="labelSmall" style={{ color: '#0277BD' }}>
                  ⏳ Paid via {p.mode}. Waiting for provider to confirm receipt on their device.
                </Text>
              )}

              {isConfirmed && p.paidAt && (
                <Text variant="labelSmall" style={{ color: '#2E7D32' }}>
                  ✓ Paid & confirmed on {new Date(p.paidAt).toLocaleDateString()}
                </Text>
              )}

              {(isPending || isOverdue) && (
                <Button
                  mode="contained"
                  buttonColor={isOverdue ? '#D32F2F' : '#1565C0'}
                  style={{ marginTop: 6 }}
                  onPress={() => {
                    setSelectedPayment(p);
                    setPayDialogVisible(true);
                  }}
                >
                  Pay Now (₹{amountRs})
                </Button>
              )}
            </Card.Content>
          </Card>
        );
      })}

      {/* Payment Mode Dialog */}
      <Portal>
        <Dialog visible={payDialogVisible} onDismiss={() => setPayDialogVisible(false)}>
          <Dialog.Title>Make Service Payment</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: '#1B5E20' }}>
              Amount: ₹{selectedPayment ? (selectedPayment.amountPaise / 100).toFixed(0) : '0'}
            </Text>

            <Text variant="labelMedium">Select Payment Method</Text>
            <SegmentedButtons
              value={paymentMode}
              onValueChange={(v) => setPaymentMode(v as any)}
              buttons={[
                { value: 'IN_APP', label: 'In-App' },
                { value: 'UPI_OFFLINE', label: 'UPI' },
                { value: 'CASH', label: 'Cash' },
              ]}
            />

            {paymentMode !== 'IN_APP' && (
              <TextInput
                label="UPI Ref / Transaction Note (Optional)"
                value={offlineRef}
                onChangeText={setOfflineRef}
                mode="outlined"
                placeholder="e.g. UPI Ref 12345678"
              />
            )}

            <Text variant="labelSmall" style={{ color: '#78909C' }}>
              {paymentMode === 'IN_APP'
                ? 'Instant confirmation in society records.'
                : 'Offline payments require the provider to tap Confirm Receipt.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={payMutation.isPending}
              onPress={() => payMutation.mutate()}
            >
              Confirm Payment
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
  header: { marginBottom: 2 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  seg: { backgroundColor: '#ffffff' },
  emptyCard: { borderRadius: 12, backgroundColor: '#ffffff' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  overdueCard: { borderColor: '#EF5350', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountText: { fontWeight: '700', color: '#212121', fontSize: 18 },
  statusChip: { backgroundColor: '#ECEFF1' },
  windowBox: { backgroundColor: '#F5F5F5', padding: 8, borderRadius: 6 },
  windowLabel: { color: '#757575', fontWeight: '500' },
  windowValue: { color: '#263238', fontWeight: '600', marginTop: 2 },
  overdueAlert: { color: '#D32F2F', fontWeight: '600' },
});
