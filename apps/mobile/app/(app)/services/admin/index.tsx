import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getVerificationQueue, getAdminComplaints, getAdminReports } from '../../../../src/services/service-hub-admin';

export default function PresidentAdminDashboardScreen() {
  const router = useRouter();

  const { data: queue = [] } = useQuery({
    queryKey: ['admin-verification-queue'],
    queryFn: async () => {
      const res = await getVerificationQueue();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['admin-complaints-count'],
    queryFn: async () => {
      const res = await getAdminComplaints('OPEN');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ['admin-reports-summary'],
    queryFn: async () => {
      const res = await getAdminReports();
      return res.data;
    },
  });

  const pendingVerificationCount = queue.length;
  const openComplaintsCount = complaints.length;
  const overdueCount = reports?.overduePayments?.length ?? 0;
  const activeCount = reports?.activeServices?.length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>President ServiceHub Control</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Ensure provider trust, verify documents, and oversee society service quality
        </Text>
      </View>

      {/* Metric Cards */}
      <View style={styles.metricsRow}>
        <Card
          style={[styles.metricCard, { backgroundColor: '#EDE7F6' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/admin/verification-queue' as never)}
        >
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#512DA8' }}>
              {pendingVerificationCount}
            </Text>
            <Text variant="labelSmall" style={{ color: '#512DA8' }}>Pending Verification</Text>
          </Card.Content>
        </Card>

        <Card
          style={[styles.metricCard, { backgroundColor: '#FFEBEE' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/admin/complaints' as never)}
        >
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#C62828' }}>
              {openComplaintsCount}
            </Text>
            <Text variant="labelSmall" style={{ color: '#C62828' }}>Open Complaints</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.metricsRow}>
        <Card
          style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/admin/reports' as never)}
        >
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#2E7D32' }}>
              {activeCount}
            </Text>
            <Text variant="labelSmall" style={{ color: '#2E7D32' }}>Active Services</Text>
          </Card.Content>
        </Card>

        <Card
          style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/admin/reports' as never)}
        >
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#E65100' }}>
              {overdueCount}
            </Text>
            <Text variant="labelSmall" style={{ color: '#E65100' }}>Overdue Payments</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Main Admin Actions */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Administrative Functions</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={{ gap: 10 }}>
          <Button
            mode="contained"
            icon="account-check"
            buttonColor="#512DA8"
            onPress={() => router.push('/(app)/services/admin/verification-queue' as never)}
          >
            Verification Queue ({pendingVerificationCount})
          </Button>

          <Button
            mode="contained"
            icon="account-plus"
            buttonColor="#1565C0"
            onPress={() => router.push('/(app)/services/admin/create-provider' as never)}
          >
            Create External Provider Account
          </Button>

          <Button
            mode="outlined"
            icon="account-group"
            onPress={() => router.push('/(app)/services/admin/providers' as never)}
          >
            All Providers Directory & Conversions
          </Button>

          <Button
            mode="outlined"
            icon="alert-octagon"
            textColor="#C62828"
            onPress={() => router.push('/(app)/services/admin/complaints' as never)}
          >
            Complaints & Violations ({openComplaintsCount})
          </Button>

          <Button
            mode="outlined"
            icon="chart-bar"
            onPress={() => router.push('/(app)/services/admin/reports' as never)}
          >
            Service Reports & Overdue Audit
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#4A148C' },
  subtitle: { color: '#6A1B9A', marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, borderRadius: 12 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  sectionTitle: { fontWeight: '600', color: '#263238', marginTop: 6 },
});
