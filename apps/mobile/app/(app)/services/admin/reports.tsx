import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { Card, Text, Chip, SegmentedButtons, Divider, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getAdminReports } from '../../../../src/services/service-hub-admin';

export default function AdminReportsScreen() {
  const [tab, setTab] = useState<'ACTIVE' | 'OVERDUE' | 'CATEGORIES'>('ACTIVE');

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports-full'],
    queryFn: async () => {
      const res = await getAdminReports();
      return res.data;
    },
  });

  const activeServices = reports?.activeServices ?? [];
  const overduePayments = reports?.overduePayments ?? [];
  const byCategory = reports?.byCategory ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>ServiceHub Reports & Audit</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Active society engagements, category distributions, and overdue audits
        </Text>
      </View>

      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as any)}
        buttons={[
          { value: 'ACTIVE', label: `Active (${activeServices.length})` },
          { value: 'OVERDUE', label: `Overdue (${overduePayments.length})` },
          { value: 'CATEGORIES', label: 'Categories' },
        ]}
        style={styles.seg}
      />

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {}
      {tab === 'ACTIVE' && (
        <View style={{ gap: 10 }}>
          {activeServices.length === 0 && (
            <Card style={styles.card} mode="outlined">
              <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text variant="bodyMedium" style={{ color: '#757575' }}>No active locked service agreements.</Text>
              </Card.Content>
            </Card>
          )}

          {activeServices.map((ag: any) => (
            <Card key={ag._id} style={styles.card} mode="elevated">
              <Card.Content style={{ gap: 6 }}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#1565C0' }}>
                    Flat {ag.seekerFlatCode}
                  </Text>
                  <Chip compact style={{ backgroundColor: '#E8F5E9' }}>{ag.workType}</Chip>
                </View>
                <Text variant="bodyMedium">
                  Provider: {ag.providerProfileId?.name || 'Provider'} ({ag.categorySlug})
                </Text>
                <Text variant="labelMedium" style={{ color: '#2E7D32', fontWeight: '700' }}>
                  ₹{(ag.pricePaise / 100).toFixed(0)} / {ag.billingUnit?.toLowerCase()}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {}
      {tab === 'OVERDUE' && (
        <View style={{ gap: 10 }}>
          {overduePayments.length === 0 && (
            <Card style={styles.card} mode="outlined">
              <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text variant="bodyMedium" style={{ color: '#2E7D32' }}>✓ Zero overdue payments in the society!</Text>
              </Card.Content>
            </Card>
          )}

          {overduePayments.map((p: any) => (
            <Card key={p._id} style={[styles.card, { borderColor: '#EF5350', borderWidth: 1 }]} mode="elevated">
              <Card.Content style={{ gap: 6 }}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#C62828' }}>
                    Overdue: ₹{(p.amountPaise / 100).toFixed(0)}
                  </Text>
                  <Chip compact style={{ backgroundColor: '#FFCDD2' }}>OVERDUE</Chip>
                </View>
                <Text variant="bodySmall">
                  Window Ended: {new Date(p.windowEnd).toLocaleDateString()}
                </Text>
                <Text variant="labelSmall" style={{ color: '#D32F2F', marginTop: 4 }}>
                  ⚠️ Reminder sent to resident. Society intervention may be initiated.
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {}
      {tab === 'CATEGORIES' && (
        <View style={{ gap: 10 }}>
          {byCategory.map((cat: any) => (
            <Card key={cat._id} style={styles.card} mode="elevated">
              <Card.Content style={{ gap: 6 }}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                    {cat._id?.replace('-', ' ')}
                  </Text>
                  <Chip compact style={{ backgroundColor: '#E0F2F1' }}>
                    {cat.count} Verified Providers
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: '#F57F17', fontWeight: '600' }}>
                  Average Rating: ★ {cat.avgRating ? cat.avgRating.toFixed(1) : '5.0'} / 5
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#4A148C' },
  subtitle: { color: '#6A1B9A', marginTop: 2 },
  seg: { backgroundColor: '#ffffff' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
