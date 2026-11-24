import React from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProviderReviews, reportReviewAbuse } from '../../../../src/services/service-hub-reviews';
import { useAuthStore } from '../../../../src/store/auth';

export default function ProviderReviewsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-received-reviews', user?.userId],
    queryFn: async () => {
      if (!user) return [];
      const res = await getProviderReviews(user.userId);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user?.userId,
  });

  const reportAbuseMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      return reportReviewAbuse(reviewId, reason);
    },
    onSuccess: () => {
      Alert.alert('Reported', 'The review has been flagged and escalated to the Society President for inspection.');
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Customer Reviews</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Ratings and feedback given by apartment residents
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && reviews.length === 0 && (
        <Card style={styles.card} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="bodyMedium" style={{ color: '#757575' }}>No reviews received yet.</Text>
          </Card.Content>
        </Card>
      )}

      {reviews.map((r: any) => (
        <Card key={r._id} style={styles.card} mode="elevated">
          <Card.Content style={{ gap: 6 }}>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: '#F57F17' }}>
                ★ {r.overallRating} / 5
              </Text>
              <Text variant="labelSmall" style={{ color: '#757575' }}>
                {new Date(r.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {r.comment ? (
              <Text variant="bodyMedium" style={{ color: '#212121' }}>{r.comment}</Text>
            ) : null}

            <View style={styles.ratingsRow}>
              {r.punctualityRating && (
                <Text variant="labelSmall" style={styles.subScore}>Punctuality: {r.punctualityRating}★</Text>
              )}
              {r.qualityRating && (
                <Text variant="labelSmall" style={styles.subScore}>Quality: {r.qualityRating}★</Text>
              )}
              {r.behaviourRating && (
                <Text variant="labelSmall" style={styles.subScore}>Behaviour: {r.behaviourRating}★</Text>
              )}
            </View>

            <Divider style={{ marginVertical: 4 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button
                mode="text"
                textColor="#D32F2F"
                compact
                onPress={() => {
                  Alert.alert('Report Abusive Review', 'Report this review to the Society President for review manipulation or abusive language?', [
                    { text: 'Cancel' },
                    {
                      text: 'Report to President',
                      style: 'destructive',
                      onPress: () =>
                        reportAbuseMutation.mutate({
                          reviewId: r._id,
                          reason: 'Abusive or defamatory comment reported by provider',
                        }),
                    },
                  ]);
                }}
              >
                Report Abuse
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  subScore: { color: '#607D8B' },
});
