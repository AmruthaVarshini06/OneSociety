import React from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviderEarnings, confirmReceipt } from '../../../../src/services/service-hub-payments';

export default function ProviderEarningsScreen() {
  const queryClient = useQueryClient();

  const { data: earnings, isLoading, refetch } = useQuery({
    queryKey: ['provider-earnings-detail'],
    queryFn: async () => {
      const res = await getProviderEarnings();
      return res.data;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return confirmReceipt(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-earnings-detail'] });
      Alert.alert('Payment Confirmed', 'You confirmed receipt of the offline payment. Record is updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  const totalReceivedRs = earnings ? (earnings.totalReceived / 100).toFixed(0) : '0';
  const pendingRs = earnings ? (earnings.pending / 100).toFixed(0) : '0';
  const overdueRs = earnings ? (earnings.overdue / 100).toFixed(0) : '0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Earnings & Payments</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Track received, pending, and overdue payments from society residents
        </Text>
      </View>

      {}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: '#E8F5E9' }]} mode="contained">
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#2E7D32' }}>
              ₹{totalReceivedRs}
            </Text>
            <Text variant="labelSmall" style={{ color: '#2E7D32' }}>Received</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#FFF9C4' }]} mode="contained">
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#F57F17' }}>
              ₹{pendingRs}
            </Text>
            <Text variant="labelSmall" style={{ color: '#F57F17' }}>Pending</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#FFEBEE' }]} mode="contained">
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#C62828' }}>
              ₹{overdueRs}
            </Text>
            <Text variant="labelSmall" style={{ color: '#C62828' }}>Overdue</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Payment Guidelines"
          subtitle="Payment windows are enforced by society rules"
        />
        <Card.Content style={{ gap: 8 }}>
          <Text variant="bodySmall" style={{ color: '#455A64' }}>
            • In-app payments are recorded and settled automatically.
          </Text>
          <Text variant="bodySmall" style={{ color: '#455A64' }}>
            • When residents pay via Cash or UPI outside the app, you MUST tap "Confirm Receipt" below to update records.
          </Text>
          <Text variant="bodySmall" style={{ color: '#455A64' }}>
            • Overdue payments are flagged after the agreed window ends, and escalated to the Society President if 7+ days past due.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 12 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
});
