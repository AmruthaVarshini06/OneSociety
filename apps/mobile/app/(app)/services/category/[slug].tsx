import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Avatar, SegmentedButtons, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listProviders } from '../../../../src/services/service-hub-providers';

export default function CategoryProvidersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [providerTypeFilter, setProviderTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState<'ALL' | 'TEMPORARY' | 'PERMANENT'>('ALL');
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ['category-providers', slug, providerTypeFilter, workTypeFilter, minRating],
    queryFn: async () => {
      const params: Record<string, any> = { categorySlug: slug, onlyVerified: true };
      if (providerTypeFilter !== 'ALL') params.providerType = providerTypeFilter;
      if (workTypeFilter !== 'ALL') params.workType = workTypeFilter;
      if (minRating) params.minRating = minRating;

      const res = await listProviders(params);
      return res.data ?? [];
    },
  });

  const formatRate = (rate?: { amountPaise: number; unit: string }) => {
    if (!rate) return 'Negotiable';
    const rs = (rate.amountPaise / 100).toFixed(0);
    return `₹${rs} / ${rate.unit.toLowerCase()}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {slug ? slug.replace('-', ' ').toUpperCase() : 'PROVIDERS'}
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Verified providers with background & reference verification
        </Text>
      </View>

      {/* Filter: Internal vs External */}
      <Text variant="labelMedium" style={styles.filterTitle}>Provider Source</Text>
      <SegmentedButtons
        value={providerTypeFilter}
        onValueChange={(v) => setProviderTypeFilter(v as any)}
        buttons={[
          { value: 'ALL', label: 'All' },
          { value: 'INTERNAL', label: 'Neighbours Only' },
          { value: 'EXTERNAL', label: 'External Only' },
        ]}
        style={styles.segButtons}
      />

      {/* Filter: Work Type */}
      <View style={styles.chipRow}>
        <Chip
          selected={workTypeFilter === 'ALL'}
          onPress={() => setWorkTypeFilter('ALL')}
          style={styles.filterChip}
        >
          All Durations
        </Chip>
        <Chip
          selected={workTypeFilter === 'TEMPORARY'}
          onPress={() => setWorkTypeFilter(workTypeFilter === 'TEMPORARY' ? 'ALL' : 'TEMPORARY')}
          style={styles.filterChip}
        >
          Temporary (Days)
        </Chip>
        <Chip
          selected={workTypeFilter === 'PERMANENT'}
          onPress={() => setWorkTypeFilter(workTypeFilter === 'PERMANENT' ? 'ALL' : 'PERMANENT')}
          style={styles.filterChip}
        >
          Permanent (Months)
        </Chip>
        <Chip
          selected={minRating === 4}
          onPress={() => setMinRating(minRating === 4 ? undefined : 4)}
          icon="star"
          style={styles.filterChip}
        >
          4.0+ Stars
        </Chip>
      </View>

      <Divider style={{ marginVertical: 8 }} />

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && providers.length === 0 && (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600', color: '#757575' }}>
              No verified providers match filters
            </Text>
            <Text variant="bodySmall" style={{ color: '#9E9E9E', textAlign: 'center', marginTop: 4 }}>
              Try loosening your filters or check back later as new providers get verified by the society president.
            </Text>
          </Card.Content>
        </Card>
      )}

      {providers.map((p: any) => {
        const isNeighbour = p.providerType === 'INTERNAL';
        return (
          <Card
            key={p._id}
            style={styles.card}
            mode="elevated"
            onPress={() => router.push(`/(app)/services/provider/${p._id}` as never)}
          >
            <Card.Content>
              <View style={styles.providerRow}>
                <Avatar.Text
                  size={54}
                  label={p.name ? p.name.substring(0, 2).toUpperCase() : 'SP'}
                  style={{ backgroundColor: isNeighbour ? '#2E7D32' : '#1565C0' }}
                />
                <View style={styles.providerInfo}>
                  <View style={styles.nameRow}>
                    <Text variant="titleMedium" style={styles.providerName}>{p.name}</Text>
                    <Chip compact icon="check-decagram" style={styles.verifiedChip}>
                      Verified
                    </Chip>
                  </View>

                  {isNeighbour ? (
                    <Text variant="labelSmall" style={styles.neighbourTag}>
                      🏡 Your neighbour, Flat {p.flatCode || 'Resident'}
                    </Text>
                  ) : (
                    <Text variant="labelSmall" style={styles.externalTag}>
                      👤 External Professional ({p.accountType})
                    </Text>
                  )}

                  <View style={styles.ratingRow}>
                    <Text variant="labelMedium" style={styles.starText}>
                      ★ {p.averageRating ? p.averageRating.toFixed(1) : '5.0'}
                    </Text>
                    <Text variant="bodySmall" style={styles.reviewCount}>
                      ({p.ratingCount ?? 0} reviews)
                    </Text>
                    <Text variant="bodySmall" style={styles.dot}>•</Text>
                    <Text variant="labelSmall" style={styles.expText}>
                      {p.experienceYears ? `${p.experienceYears} yrs exp` : 'Experienced'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.rateRow}>
                <Text variant="bodySmall" style={styles.indicativeLabel}>Indicative Rate:</Text>
                <Text variant="titleSmall" style={styles.rateValue}>{formatRate(p.indicativeRate)}</Text>
              </View>

              {p.optionsOffered && p.optionsOffered.length > 0 && (
                <View style={styles.optionsWrap}>
                  {p.optionsOffered.slice(0, 3).map((opt: string, i: number) => (
                    <Chip key={i} compact style={styles.optionChip}>{opt}</Chip>
                  ))}
                  {p.optionsOffered.length > 3 && (
                    <Text variant="labelSmall" style={styles.moreOpts}>
                      +{p.optionsOffered.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => router.push(`/(app)/services/provider/${p._id}` as never)}>
                View Profile & Book
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 10 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  filterTitle: { fontWeight: '600', color: '#37474F' },
  segButtons: { backgroundColor: '#ffffff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  filterChip: { backgroundColor: '#ECEFF1' },
  emptyCard: { borderRadius: 12, backgroundColor: '#ffffff' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  providerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  providerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  providerName: { fontWeight: '700', color: '#212121' },
  verifiedChip: { backgroundColor: '#E8F5E9' },
  neighbourTag: { color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  externalTag: { color: '#1565C0', fontWeight: '500', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  starText: { color: '#F57F17', fontWeight: '700' },
  reviewCount: { color: '#757575' },
  dot: { color: '#BDBDBD' },
  expText: { color: '#455A64' },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, backgroundColor: '#F5F5F5', padding: 8, borderRadius: 6 },
  indicativeLabel: { color: '#616161' },
  rateValue: { fontWeight: '700', color: '#1B5E20' },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  optionChip: { backgroundColor: '#E0F2F1' },
  moreOpts: { color: '#00796B', fontWeight: '500' },
});
