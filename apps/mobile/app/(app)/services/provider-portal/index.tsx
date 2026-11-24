import React from 'react';
import { StyleSheet, ScrollView, View, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVisits, confirmVisitByProvider } from '../../../../src/services/service-hub-visits';
import { getProviderRequests } from '../../../../src/services/service-hub-requests';
import { getProviderEarnings } from '../../../../src/services/service-hub-payments';

export default function ProviderPortalHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: todayVisits = [], isLoading: visitsLoading, refetch: refetchVisits } = useQuery({
    queryKey: ['provider-today-visits'],
    queryFn: async () => {
      const res = await getVisits({ date: 'today' });
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['provider-requests-count'],
    queryFn: async () => {
      const res = await getProviderRequests();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ['provider-earnings-summary'],
    queryFn: async () => {
      const res = await getProviderEarnings();
      return res.data;
    },
  });

  const confirmDoneMutation = useMutation({
    mutationFn: async (visitId: string) => {
      return confirmVisitByProvider(visitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-today-visits'] });
      Alert.alert('Visit Confirmed', 'You marked this visit as done. The resident has been notified to confirm.');
    },
  });

  const pendingRequestsCount = requests.filter((r: any) => r.status === 'REQUESTED').length;
  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={visitsLoading} onRefresh={refetchVisits} />}
    >
      {}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Provider Portal</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Today is {todayDateStr}
        </Text>
      </View>

      {}
      <View style={styles.summaryRow}>
        <Card
          style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/provider-portal/inbox' as never)}
        >
          <Card.Content style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text variant="headlineSmall" style={{ color: '#1565C0', fontWeight: '700' }}>
              {pendingRequestsCount}
            </Text>
            <Text variant="labelSmall" style={{ color: '#1565C0' }}>Pending Requests</Text>
          </Card.Content>
        </Card>

        <Card
          style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}
          mode="contained"
          onPress={() => router.push('/(app)/services/provider-portal/earnings' as never)}
        >
          <Card.Content style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text variant="headlineSmall" style={{ color: '#2E7D32', fontWeight: '700' }}>
              ₹{earnings ? (earnings.totalReceived / 100).toFixed(0) : '0'}
            </Text>
            <Text variant="labelSmall" style={{ color: '#2E7D32' }}>Earnings</Text>
          </Card.Content>
        </Card>
      </View>

      {}
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Today's Schedule (Where & When to Go)"
          subtitle="Visits scheduled for today by flat and time"
        />
        <Card.Content style={{ gap: 10 }}>
          {visitsLoading && <ActivityIndicator animating={true} />}

          {!visitsLoading && todayVisits.length === 0 && (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ color: '#757575' }}>No visits scheduled for today.</Text>
            </View>
          )}

          {todayVisits.map((v: any) => {
            const isDone = v.confirmedByProvider;
            const isBothDone = v.status === 'CONFIRMED_DONE';
            return (
              <View key={v._id} style={styles.visitRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#1565C0' }}>
                    Flat {v.flatCode}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#424242' }}>
                    ⏰ {v.scheduledTimeSlot?.from} - {v.scheduledTimeSlot?.to}
                  </Text>
                  <Text variant="labelSmall" style={{ color: isBothDone ? '#2E7D32' : '#E65100', marginTop: 2 }}>
                    Status: {isBothDone ? '✓ Completed by both' : isDone ? '✓ Provider confirmed (awaiting seeker)' : 'Scheduled'}
                  </Text>
                </View>

                {!isDone ? (
                  <Button
                    mode="contained"
                    compact
                    buttonColor="#2E7D32"
                    loading={confirmDoneMutation.isPending}
                    onPress={() => confirmDoneMutation.mutate(v._id)}
                  >
                    Mark Done
                  </Button>
                ) : (
                  <Chip compact icon="check" style={{ backgroundColor: '#C8E6C9' }}>
                    Done
                  </Chip>
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {}
      <Text variant="titleMedium" style={styles.sectionTitle}>Manage Your Business</Text>

      <View style={styles.grid}>
        <Button
          mode="outlined"
          icon="inbox"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/inbox' as never)}
        >
          Inbox ({pendingRequestsCount})
        </Button>
        <Button
          mode="outlined"
          icon="calendar-month"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/schedule' as never)}
        >
          Full Schedule
        </Button>
        <Button
          mode="outlined"
          icon="clock-outline"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/availability' as never)}
        >
          Availability
        </Button>
        <Button
          mode="outlined"
          icon="cash-multiple"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/earnings' as never)}
        >
          Earnings
        </Button>
        <Button
          mode="outlined"
          icon="account-box"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/profile' as never)}
        >
          Profile & Docs
        </Button>
        <Button
          mode="outlined"
          icon="star-outline"
          style={styles.gridBtn}
          onPress={() => router.push('/(app)/services/provider-portal/reviews' as never)}
        >
          Reviews
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 12 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  sectionTitle: { fontWeight: '600', color: '#263238', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridBtn: { width: '48%', borderRadius: 8 },
});
