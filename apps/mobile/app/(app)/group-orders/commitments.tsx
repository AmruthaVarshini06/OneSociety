import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, FlatList } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
  TextInput,
  Modal,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupOrder } from '../../../src/services/group-orders';
import {
  getCommitmentSummary,
  openOrder,
  openPaymentWindow,
  closePaymentWindow,
  type CommitmentSummaryItem,
} from '../../../src/services/commitments';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function GroupOrderCommitmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [paymentHours, setPaymentHours] = useState('48');

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['commitments-summary', id],
    queryFn: () => getCommitmentSummary(id),
    enabled: !!id,
  });

  const order = orderData?.order;

  const openOrderMutation = useMutation({
    mutationFn: () => openOrder(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['commitments-summary', id] });
      Alert.alert('Order Opened', `Created ${data.commitmentsCount} commitments from demand pooling.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to open order');
    },
  });

  const openPaymentMutation = useMutation({
    mutationFn: () => openPaymentWindow(id, parseInt(paymentHours, 10) || 48),
    onSuccess: () => {
      setHoursModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['commitments-summary', id] });
      Alert.alert('Success', 'Payment window is now OPEN.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to open payment window');
    },
  });

  const closePaymentMutation = useMutation({
    mutationFn: () => closePaymentWindow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['commitments-summary', id] });
      Alert.alert('Success', 'Payment window closed. Orders reconciled.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to close payment window');
    },
  });

  if (isOrderLoading || isSummaryLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading commitments...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !order || !summary) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Failed to load commitments summary.</Text>
        <Button mode="outlined" onPress={() => refetch()} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  const { counts, totalPaidPaise, totalPaidUnits, commitments } = summary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.title}>
                {order.productName}
              </Text>
              <Chip style={styles.statusChip} textStyle={styles.statusChipText}>
                {order.status}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.paid}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.cancelled}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{counts.refunded}</Text>
                <Text style={styles.statLabel}>Refunded</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Paid Units Collected:</Text>
              <Text style={styles.value}>
                {totalPaidUnits} / {order.minimumQuantity} min required
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Escrow Collected:</Text>
              <Text style={[styles.value, { color: '#1B5E20' }]}>
                {formatPaise(totalPaidPaise)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {}
        {order.status === 'SUPPLIER_SELECTED' && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#2E7D32' }}>
                Ready to Open Order
              </Text>
              <Text style={[styles.subtext, { marginTop: 4, marginBottom: 12 }]}>
                Supplier is selected. Opening order locks the bulk tier price for all residents
                and prepares commitments.
              </Text>
              <Button
                mode="contained"
                style={{ backgroundColor: '#2E7D32' }}
                loading={openOrderMutation.isPending}
                onPress={() => openOrderMutation.mutate()}
              >
                Open Order for Commitments
              </Button>
            </Card.Content>
          </Card>
        )}

        {order.status === 'GROUP_ORDER_OPEN' && (
          <Card style={[styles.card, { backgroundColor: '#FFF9C4' }]}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#F57F17' }}>
                Ready for Payment
              </Text>
              <Text style={[styles.subtext, { marginTop: 4, marginBottom: 12 }]}>
                Order is open. Open payment window to notify residents to pay into escrow.
              </Text>
              <Button
                mode="contained"
                style={{ backgroundColor: '#F57F17' }}
                onPress={() => setHoursModalVisible(true)}
              >
                Open Payment Window
              </Button>
            </Card.Content>
          </Card>
        )}

        {order.status === 'PAYMENT_WINDOW' && (
          <Card style={[styles.card, { backgroundColor: '#E1F5FE' }]}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#0277BD' }}>
                Payment Window Active
              </Text>
              <Text style={[styles.subtext, { marginTop: 4, marginBottom: 12 }]}>
                Residents are completing payments. You can close the window early once paid
                commitments meet requirements.
              </Text>
              <Button
                mode="contained"
                style={{ backgroundColor: '#C62828' }}
                loading={closePaymentMutation.isPending}
                onPress={() => {
                  Alert.alert(
                    'Close Payment Window?',
                    'This will cancel all unpaid commitments and transition to delivery if minimum units are reached.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Close Now', onPress: () => closePaymentMutation.mutate() },
                    ],
                  );
                }}
              >
                Close Payment Window Now
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Resident Commitments ({commitments.length})
        </Text>

        {commitments.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.subtext, { textAlign: 'center' }]}>
                No commitments generated yet.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          commitments.map((c: CommitmentSummaryItem) => {
            const isPaid = c.status === 'PAID';
            return (
              <Card key={c._id} style={styles.commitmentCard}>
                <Card.Content>
                  <View style={styles.row}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Flat {c.flatNumber}
                    </Text>
                    <Chip
                      style={{
                        backgroundColor: isPaid ? '#E8F5E9' : '#FFF9C4',
                        height: 28,
                      }}
                      textStyle={{
                        fontSize: 11,
                        color: isPaid ? '#2E7D32' : '#F57F17',
                        fontWeight: 'bold',
                      }}
                    >
                      {c.status}
                    </Chip>
                  </View>
                  <Text style={styles.subtext}>Resident: {c.residentName}</Text>
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <Text style={styles.subtext}>
                      {c.quantityWanted} {order.unit}s @ {formatPaise(c.pricePerUnit)}
                    </Text>
                    <Text style={{ fontWeight: 'bold' }}>{formatPaise(c.totalAmountPaise)}</Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {}
      <Portal>
        <Modal
          visible={hoursModalVisible}
          onDismiss={() => setHoursModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Open Payment Window
          </Text>
          <Text style={[styles.subtext, { marginBottom: 16 }]}>
            Specify how many hours residents have to complete payment into escrow:
          </Text>
          <TextInput
            label="Duration in hours"
            value={paymentHours}
            onChangeText={setPaymentHours}
            keyboardType="number-pad"
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setHoursModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={openPaymentMutation.isPending}
              onPress={() => openPaymentMutation.mutate()}
            >
              Confirm & Open
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
  card: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  commitmentCard: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', flex: 1 },
  statusChip: { backgroundColor: '#E3F2FD' },
  statusChipText: { color: '#1565C0', fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#666666' },
  value: { fontWeight: '600' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 4 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  statLabel: { fontSize: 11, color: '#757575', marginTop: 2 },
  sectionHeader: { fontWeight: 'bold', marginVertical: 12, color: '#424242' },
  subtext: { color: '#666666', fontSize: 13 },
  errorText: { color: '#C62828', fontSize: 16 },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
});
