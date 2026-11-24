import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Card, Text, Button, Chip, Avatar, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProvider } from '../../../../src/services/service-hub-providers';
import { getProviderReviews } from '../../../../src/services/service-hub-reviews';
import { useAuthStore } from '../../../../src/store/auth';

const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider-detail', id],
    queryFn: async () => {
      const res = await getProvider(id);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', id],
    queryFn: async () => {
      const res = await getProviderReviews(id);
      return res.data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Provider not found</Text>
      </View>
    );
  }

  const isNeighbour = provider.providerType === 'INTERNAL';
  const isSelf = provider.userId?.toString() === currentUser?.userId;

  const formatRate = (rate?: { amountPaise: number; unit: string }) => {
    if (!rate) return 'To be negotiated';
    const rs = (rate.amountPaise / 100).toFixed(0);
    return `₹${rs} / ${rate.unit.toLowerCase()}`;
  };

  const workingDays = provider.availability?.daysOfWeek
    ?.map((d: number) => DAYS_MAP[d])
    .join(', ') || 'Mon, Tue, Wed, Thu, Fri, Sat';

  const workingHours = provider.availability?.workingHours
    ? `${provider.availability.workingHours.from} - ${provider.availability.workingHours.to}`
    : '09:00 - 18:00';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.headerContent}>
          <Avatar.Text
            size={72}
            label={provider.name ? provider.name.substring(0, 2).toUpperCase() : 'SP'}
            style={{ backgroundColor: isNeighbour ? '#2E7D32' : '#1565C0' }}
          />
          <Text variant="headlineSmall" style={styles.name}>{provider.name}</Text>

          <View style={styles.badgeRow}>
            <Chip icon="check-decagram" style={styles.verifiedChip}>
              Verified by President
            </Chip>
            {isNeighbour ? (
              <Chip icon="home" style={styles.neighbourChip}>
                Neighbour (Flat {provider.flatCode || 'Resident'})
              </Chip>
            ) : (
              <Chip icon="account-tie" style={styles.externalChip}>
                External Provider ({provider.accountType})
              </Chip>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>
                ★ {provider.averageRating ? provider.averageRating.toFixed(1) : '5.0'}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>{provider.ratingCount ?? 0} Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>
                {provider.experienceYears ?? 0} yrs
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>
                {provider.trustScore ?? 100}%
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Trust Score</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Services Offered" />
        <Card.Content>
          <View style={styles.optionsWrap}>
            {provider.optionsOffered?.map((opt: string, i: number) => (
              <Chip key={i} style={styles.optionChip} icon="check-circle">
                {opt}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="About & Qualifications" />
        <Card.Content style={{ gap: 8 }}>
          <Text variant="bodyMedium" style={{ color: '#424242' }}>
            {provider.bio || 'Verified provider registered with the society skills marketplace.'}
          </Text>
          <Divider style={{ marginVertical: 6 }} />
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Indicative Rate:</Text>
            <Text variant="titleSmall" style={styles.rateValue}>{formatRate(provider.indicativeRate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Work Accepted:</Text>
            <Text variant="bodyMedium">{provider.workTypesAccepted || 'Temporary & Permanent'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Languages:</Text>
            <Text variant="bodyMedium">{provider.languages?.join(', ') || 'English, Hindi'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Working Days:</Text>
            <Text variant="bodyMedium">{workingDays}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Working Hours:</Text>
            <Text variant="bodyMedium">{workingHours}</Text>
          </View>
          <View style={styles.privacyNote}>
            <Text variant="labelSmall" style={{ color: '#78909C' }}>
              🔒 Phone numbers stay hidden until request discussion begins. All providers are verified by the society president.
            </Text>
          </View>
        </Card.Content>
      </Card>

      {}
      <Card style={styles.card} mode="elevated">
        <Card.Title title={`Reviews (${reviews.length})`} />
        <Card.Content style={{ gap: 10 }}>
          {reviews.length === 0 ? (
            <Text variant="bodySmall" style={{ color: '#9E9E9E' }}>
              No reviews yet. Be the first to book and rate!
            </Text>
          ) : (
            reviews.map((r: any) => (
              <View key={r._id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text variant="labelLarge" style={{ fontWeight: '600' }}>
                    ★ {r.overallRating} / 5
                  </Text>
                  <Text variant="labelSmall" style={{ color: '#757575' }}>
                    {r.reviewType === 'FINAL' ? 'Final Review' : 'Mid-Service Review'}
                  </Text>
                </View>
                {r.comment && <Text variant="bodyMedium" style={{ marginTop: 2 }}>{r.comment}</Text>}
                <View style={styles.breakdownRow}>
                  {r.punctualityRating && <Text variant="labelSmall" style={styles.subScore}>Punctuality: {r.punctualityRating}★</Text>}
                  {r.qualityRating && <Text variant="labelSmall" style={styles.subScore}>Quality: {r.qualityRating}★</Text>}
                  {r.behaviourRating && <Text variant="labelSmall" style={styles.subScore}>Behaviour: {r.behaviourRating}★</Text>}
                </View>
                <Divider style={{ marginTop: 8 }} />
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {}
      <View style={styles.ctaWrap}>
        {isSelf ? (
          <Button mode="contained" disabled style={styles.ctaBtn}>
            This is your own profile
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="calendar-plus"
            style={styles.ctaBtn}
            buttonColor="#1565C0"
            onPress={() =>
              router.push({
                pathname: '/(app)/services/request/new',
                params: {
                  providerId: provider._id,
                  providerName: provider.name,
                  categorySlug: provider.categorySlug,
                  options: JSON.stringify(provider.optionsOffered || []),
                },
              } as never)
            }
          >
            Request Service
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  headerContent: { alignItems: 'center', paddingVertical: 16 },
  name: { fontWeight: '700', color: '#212121', marginTop: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'center' },
  verifiedChip: { backgroundColor: '#E8F5E9' },
  neighbourChip: { backgroundColor: '#E8F5E9' },
  externalChip: { backgroundColor: '#E3F2FD' },
  statsRow: { flexDirection: 'row', marginTop: 16, width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  statBox: { alignItems: 'center' },
  statValue: { fontWeight: '700', color: '#1565C0' },
  statLabel: { color: '#757575', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E0E0E0' },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { backgroundColor: '#E0F2F1' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { color: '#616161', fontWeight: '500' },
  rateValue: { fontWeight: '700', color: '#1B5E20' },
  privacyNote: { backgroundColor: '#ECEFF1', padding: 8, borderRadius: 6, marginTop: 6 },
  reviewItem: { paddingVertical: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  subScore: { color: '#607D8B' },
  ctaWrap: { paddingVertical: 10 },
  ctaBtn: { borderRadius: 8, paddingVertical: 4 },
});
