import React from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getSeekerRequests } from '../../../src/services/service-hub-requests';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  REQUESTED: { bg: '#E3F2FD', text: '#1565C0' },
  UNDER_DISCUSSION: { bg: '#FFF3E0', text: '#E65100' },
  AGREED: { bg: '#E8F5E9', text: '#2E7D32' },
  ACTIVE: { bg: '#E0F2F1', text: '#00695C' },
  COMPLETED: { bg: '#ECEFF1', text: '#455A64' },
  DECLINED: { bg: '#FFEBEE', text: '#C62828' },
  EXPIRED: { bg: '#F5F5F5', text: '#9E9E9E' },
  CANCELLED: { bg: '#F5F5F5', text: '#9E9E9E' },
  TERMINATED: { bg: '#FFEBEE', text: '#B71C1C' },
};

export default function MyActiveServicesScreen() {
  const router = useRouter();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['my-seeker-requests'],
    queryFn: async () => {
      const res = await getSeekerRequests();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>My Booked Services</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Track your active service requests, negotiations, and locked agreements
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && requests.length === 0 && (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600', color: '#757575' }}>
              No active service bookings
            </Text>
            <Text variant="bodySmall" style={{ color: '#9E9E9E', textAlign: 'center', marginTop: 4 }}>
              Browse categories and request help from verified neighbours and external experts.
            </Text>
            <Button
              mode="contained"
              style={{ marginTop: 16 }}
              onPress={() => router.push('/(app)/services' as never)}
            >
              Browse Services
            </Button>
          </Card.Content>
        </Card>
      )}

      {requests.map((req: any) => {
        const color = STATUS_COLORS[req.status] || { bg: '#ECEFF1', text: '#37474F' };
        const providerName = req.providerProfileId?.name || 'Service Provider';
        const isNeighbour = req.providerProfileId?.providerType === 'INTERNAL';

        return (
          <Card key={req._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.providerName}>{providerName}</Text>
                  <Text variant="labelSmall" style={isNeighbour ? styles.neighbourText : styles.externalText}>
                    {isNeighbour ? '🏡 Neighbour' : '👤 External Professional'}
                  </Text>
                </View>
                <Chip compact style={{ backgroundColor: color.bg }} textStyle={{ color: color.text, fontSize: 11, fontWeight: '700' }}>
                  {req.status.replace(/_/g, ' ')}
                </Chip>
              </View>

              <Divider />

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Service:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{req.optionSlug}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Slot:</Text>
                <Text variant="bodyMedium">
                  {req.dailyTimeSlot?.from} - {req.dailyTimeSlot?.to}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Duration:</Text>
                <Text variant="bodySmall">
                  {new Date(req.startDate).toLocaleDateString()}
                  {req.endDate ? ` to ${new Date(req.endDate).toLocaleDateString()}` : ' (Ongoing)'}
                </Text>
              </View>

              <View style={styles.btnRow}>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => router.push(`/(app)/services/request/${req._id}` as never)}
                >
                  Details
                </Button>

                {['UNDER_DISCUSSION', 'AGREED', 'ACTIVE'].includes(req.status) && (
                  <Button
                    mode="contained"
                    compact
                    buttonColor="#1565C0"
                    onPress={() => router.push(`/(app)/services/chat/${req._id}` as never)}
                  >
                    Chat
                  </Button>
                )}

                {req.agreedAgreementId && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() =>
                      router.push(`/(app)/services/agreements/${req.agreedAgreementId}` as never)
                    }
                  >
                    Agreement
                  </Button>
                )}

                {['ACTIVE', 'COMPLETED'].includes(req.status) && (
                  <Button
                    mode="contained"
                    compact
                    buttonColor="#2E7D32"
                    onPress={() =>
                      router.push({
                        pathname: `/(app)/services/reviews/${req._id}`,
                        params: { agreementId: req.agreedAgreementId },
                      } as never)
                    }
                  >
                    Rate
                  </Button>
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
  providerName: { fontWeight: '700', color: '#212121' },
  neighbourText: { color: '#2E7D32', fontWeight: '500' },
  externalText: { color: '#1565C0', fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#757575' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
