import React from 'react';
import { StyleSheet, ScrollView, View, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVisits, confirmVisitByProvider } from '../../../../src/services/service-hub-visits';

export default function ProviderScheduleScreen() {
  const queryClient = useQueryClient();

  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ['provider-upcoming-visits'],
    queryFn: async () => {
      const res = await getVisits();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (visitId: string) => {
      return confirmVisitByProvider(visitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-upcoming-visits'] });
      Alert.alert('Done', 'Visit marked completed.');
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>My Schedule</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          All scheduled apartment visits across upcoming days
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && visits.length === 0 && (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="bodyMedium" style={{ color: '#757575' }}>No upcoming visits scheduled.</Text>
          </Card.Content>
        </Card>
      )}

      {visits.map((v: any) => {
        const isDone = v.confirmedByProvider;
        const isBothDone = v.status === 'CONFIRMED_DONE';
        const isNoShow = v.status === 'NO_SHOW';

        return (
          <Card key={v._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#1565C0' }}>
                    Flat {v.flatCode}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#616161' }}>
                    📅 {new Date(v.scheduledDate).toDateString()}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{
                    backgroundColor: isBothDone ? '#C8E6C9' : isNoShow ? '#FFCDD2' : '#E3F2FD',
                  }}
                >
                  {v.status.replace(/_/g, ' ')}
                </Chip>
              </View>

              <Divider />

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={{ color: '#757575' }}>Time Slot:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  {v.scheduledTimeSlot?.from} - {v.scheduledTimeSlot?.to}
                </Text>
              </View>

              <View style={styles.actions}>
                {!isDone && !isNoShow && (
                  <Button
                    mode="contained"
                    buttonColor="#2E7D32"
                    compact
                    loading={confirmMutation.isPending}
                    onPress={() => confirmMutation.mutate(v._id)}
                  >
                    Mark Done for Today
                  </Button>
                )}

                {isDone && (
                  <Text variant="labelSmall" style={{ color: '#2E7D32', fontWeight: '600' }}>
                    ✓ Confirmed by you
                  </Text>
                )}
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
});
