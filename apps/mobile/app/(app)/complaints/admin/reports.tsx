import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { getPresidentReports } from '../../../../src/services/complaints';

export default function ComplaintsReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await getPresidentReports();
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  if (loading || !reports) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Key Quality Metrics */}
      <View style={styles.kpiRow}>
        <Card style={[styles.kpiCard, { backgroundColor: '#EFF6FF' }]} mode="contained">
          <Card.Content>
            <Text style={styles.kpiVal}>{reports.reopenRatePercent}%</Text>
            <Text style={styles.kpiLabel}>Reopen Rate</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.kpiCard, { backgroundColor: '#F0FDF4' }]} mode="contained">
          <Card.Content>
            <Text style={styles.kpiVal}>{reports.repeatProblemAreas?.length || 0}</Text>
            <Text style={styles.kpiLabel}>Repeat Areas</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Repeat Problem Areas Card */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>🔁 Repeat Problem Areas</Text>
          <Text style={styles.sectionSub}>Areas with multiple reports needing structural fixes:</Text>

          {reports.repeatProblemAreas?.length === 0 ? (
            <Text style={styles.emptyText}>No repeat hotspot areas detected.</Text>
          ) : (
            reports.repeatProblemAreas?.map((item: any, idx: number) => (
              <View key={idx} style={styles.repeatItem}>
                <View style={styles.repeatLeft}>
                  <Text style={styles.repeatArea}>📍 {item.area}</Text>
                  <Text style={styles.repeatCat}>Category: {item.category}</Text>
                </View>
                <Chip style={styles.repeatBadge} compact>
                  {item.count} reports
                </Chip>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Spending Breakdown by Category */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>💰 Repair Spending by Category</Text>
          {Object.keys(reports.spendingByCategory || {}).length === 0 ? (
            <Text style={styles.emptyText}>No repair expenses recorded yet.</Text>
          ) : (
            Object.entries(reports.spendingByCategory).map(([cat, paise]: any, idx) => (
              <View key={idx} style={styles.spendRow}>
                <Text style={styles.spendCat}>{cat}</Text>
                <Text style={styles.spendVal}>Rs. {Math.round(paise / 100).toLocaleString()}</Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Complaints by Category */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>📊 Issues by Category</Text>
          {Object.entries(reports.byCategory || {}).map(([cat, count]: any, idx) => (
            <View key={idx} style={styles.statRow}>
              <Text style={styles.statLabel}>{cat}</Text>
              <Chip style={styles.statChip} compact>{count}</Chip>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Complaints by Block */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>🏢 Issues by Block</Text>
          <View style={styles.blockGrid}>
            {Object.entries(reports.byBlock || {}).map(([block, count]: any, idx) => (
              <View key={idx} style={styles.blockItem}>
                <Text style={styles.blockName}>Block {block}</Text>
                <Text style={styles.blockCount}>{count} issues</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Vendor Performance Audit */}
      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>🛠️ Vendor Performance Audit</Text>
          {reports.vendorPerformance?.length === 0 ? (
            <Text style={styles.emptyText}>No vendor jobs completed yet.</Text>
          ) : (
            reports.vendorPerformance?.map((v: any, idx: number) => (
              <View key={idx} style={styles.vendorAuditRow}>
                <View>
                  <Text style={styles.vendorAuditName}>{v.vendor}</Text>
                  <Text style={styles.vendorAuditStats}>
                    Avg resolution: {v.avgDaysToSolve}d • Reopen rate: {v.reopenRate}%
                  </Text>
                </View>
                <Chip style={styles.vendorJobsBadge} compact>
                  {v.jobs} jobs
                </Chip>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 14, paddingBottom: 50 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 10 },
  kpiVal: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  kpiLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  sectionSub: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', marginVertical: 6 },
  repeatItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 6 },
  repeatLeft: { flex: 1 },
  repeatArea: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  repeatCat: { fontSize: 11, color: '#64748B', marginTop: 2 },
  repeatBadge: { backgroundColor: '#FEE2E2', height: 26 },
  spendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  spendCat: { fontSize: 13, color: '#334155' },
  spendVal: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  statLabel: { fontSize: 13, color: '#334155', flex: 1 },
  statChip: { height: 24 },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  blockItem: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, width: '48%' },
  blockName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  blockCount: { fontSize: 12, color: '#64748B', marginTop: 2 },
  vendorAuditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 6 },
  vendorAuditName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  vendorAuditStats: { fontSize: 11, color: '#64748B', marginTop: 2 },
  vendorJobsBadge: { height: 26 },
});
