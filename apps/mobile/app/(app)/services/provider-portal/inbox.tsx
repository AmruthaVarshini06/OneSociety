import React from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviderRequests, respondToRequest } from '../../../../src/services/service-hub-requests';

export default function ProviderInboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['provider-inbox-requests'],
    queryFn: async () => {
      const res = await getProviderRequests();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return respondToRequest(requestId, { action: 'ACCEPT' });
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['provider-inbox-requests'] });
      router.push(`/(app)/services/chat/${requestId}` as never);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      return respondToRequest(requestId, { action: 'DECLINE', declineReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-inbox-requests'] });
      Alert.alert('Declined', 'Request declined.');
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Incoming Requests</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Review resident requests, accept to negotiate price, or decline with one tap.
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && requests.length === 0 && (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="bodyMedium" style={{ color: '#757575' }}>No service requests received yet.</Text>
          </Card.Content>
        </Card>
      )}

      {requests.map((r: any) => {
        const isNew = r.status === 'REQUESTED';
        const isDiscussing = r.status === 'UNDER_DISCUSSION';

        return (
          <Card key={r._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.flatText}>Flat {r.flatNumber || r.seekerFlatCode}</Text>
                  <Text variant="bodySmall" style={{ color: '#616161' }}>Resident: {r.seekerName}</Text>
                </View>
                <Chip compact style={{ backgroundColor: isNew ? '#FFF3E0' : '#E8F5E9' }}>
                  {r.status.replace(/_/g, ' ')}
                </Chip>
              </View>

              <Divider />

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Service:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{r.optionSlug}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Time Slot:</Text>
                <Text variant="bodyMedium">{r.dailyTimeSlot?.from} - {r.dailyTimeSlot?.to}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Duration:</Text>
                <Text variant="bodySmall">
                  {new Date(r.startDate).toLocaleDateString()}
                  {r.endDate ? ` to ${new Date(r.endDate).toLocaleDateString()}` : ' (Ongoing)'}
                </Text>
              </View>

              {r.proposedBudgetPaise && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Proposed Budget:</Text>
                  <Text variant="titleSmall" style={{ color: '#2E7D32', fontWeight: '700' }}>
                    ₹{(r.proposedBudgetPaise / 100).toFixed(0)}
                  </Text>
                </View>
              )}

              <Text variant="bodySmall" style={{ color: '#424242', marginTop: 4 }}>
                Requirements: {r.requirementsText}
              </Text>

              <View style={styles.actions}>
                {isNew && (
                  <>
                    <Button
                      mode="contained"
                      buttonColor="#2E7D32"
                      compact
                      loading={acceptMutation.isPending}
                      onPress={() => acceptMutation.mutate(r._id)}
                    >
                      Accept & Chat
                    </Button>
                    <Button
                      mode="outlined"
                      textColor="#D32F2F"
                      compact
                      onPress={() => {
                        Alert.alert('Decline Request', 'Select or confirm decline reason:', [
                          { text: 'Cancel' },
                          { text: 'Slot Unavailable', onPress: () => declineMutation.mutate({ requestId: r._id, reason: 'Time slot unavailable' }) },
                          { text: 'Outside Scope', onPress: () => declineMutation.mutate({ requestId: r._id, reason: 'Work outside expertise' }) },
                        ]);
                      }}
                    >
                      Decline
                    </Button>
                  </>
                )}

                {isDiscussing && (
                  <Button
                    mode="contained"
                    buttonColor="#1565C0"
                    compact
                    onPress={() => router.push(`/(app)/services/chat/${r._id}` as never)}
                  >
                    Open Negotiation Chat
                  </Button>
                )}

                <Button
                  mode="text"
                  compact
                  onPress={() => router.push(`/(app)/services/request/${r._id}` as never)}
                >
                  View Details
                </Button>
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  emptyCard: { borderRadius: 12, backgroundColor: '#ffffff' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatText: { fontWeight: '700', color: '#1565C0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#757575' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
});
