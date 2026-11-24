import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import {
  getPresidentDashboard,
  getComplaintsFeed,
  getBatchingSuggestions,
} from '../../../../src/services/complaints';

export default function PresidentComplaintsCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [batchingSuggestions, setBatchingSuggestions] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'queue' | 'kanban' | 'batching'>('queue');

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, feedRes, batchRes] = await Promise.all([
        getPresidentDashboard(),
        getComplaintsFeed(),
        getBatchingSuggestions(),
      ]);
      setMetrics(dashRes.data);
      setIssues(feedRes.data.feed || []);
      setBatchingSuggestions(batchRes.data.suggestions || []);
    } catch (err) {
      console.error('Failed to load president data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#B00020';
      case 'HIGH':
        return '#D97706';
      case 'MEDIUM':
        return '#2563EB';
      default:
        return '#64748B';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Filter issues for priority queue: Needs Action (NEW or REOPENED)
  const priorityQueueIssues = issues
    .filter(i => i.status === 'NEW' || i.status === 'REOPENED')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const kanbanColumns = [
    { key: 'NEW', label: 'New Reports', color: '#6366F1' },
    { key: 'CONTACTED', label: 'Contacted', color: '#0284C7' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: '#D97706' },
    { key: 'SOLVED', label: 'Solved (Awaiting Cost)', color: '#16A34A' },
    { key: 'REOPENED', label: 'Reopened', color: '#DC2626' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Metric Cards Row */}
      {metrics && (
        <View style={styles.metricsGrid}>
          <Card style={[styles.metricCard, { backgroundColor: '#EFF6FF' }]} mode="contained">
            <Card.Content>
              <Text style={styles.metricVal}>{metrics.totalIssuesCount || 0}</Text>
              <Text style={styles.metricLabel}>Total Issues</Text>
            </Card.Content>
          </Card>

          <Card
            style={[
              styles.metricCard,
              { backgroundColor: metrics.pastTargetTimeCount > 0 ? '#FEE2E2' : '#F1F5F9' },
            ]}
            mode="contained"
          >
            <Card.Content>
              <Text
                style={[
                  styles.metricVal,
                  { color: metrics.pastTargetTimeCount > 0 ? '#DC2626' : '#1E293B' },
                ]}
              >
                {metrics.pastTargetTimeCount || 0}
              </Text>
              <Text style={styles.metricLabel}>SLA Breached</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]} mode="contained">
            <Card.Content>
              <Text style={styles.metricVal}>
                Rs. {Math.round((metrics.totalSpentThisMonthPaise || 0) / 100).toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>Spent This Month</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: '#FAF5FF' }]} mode="contained">
            <Card.Content>
              <Text style={styles.metricVal}>{metrics.avgSolvingTimeDays || 0}d</Text>
              <Text style={styles.metricLabel}>Avg Resolve Time</Text>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Directory & Analytics Navigation Shortcuts */}
      <View style={styles.navRow}>
        <Button
          mode="outlined"
          icon="account-hard-hat"
          style={styles.navBtn}
          onPress={() => router.push('/(app)/complaints/admin/vendors' as any)}
        >
          Local Vendors
        </Button>
        <Button
          mode="outlined"
          icon="chart-bar"
          style={styles.navBtn}
          onPress={() => router.push('/(app)/complaints/admin/reports' as any)}
        >
          Reports & Audits
        </Button>
      </View>

      {/* View Mode Toggle */}
      <SegmentedButtons
        value={viewTab}
        onValueChange={v => setViewTab(v as any)}
        buttons={[
          { value: 'queue', label: `Priority Queue (${priorityQueueIssues.length})` },
          { value: 'kanban', label: 'Kanban Board' },
          { value: 'batching', label: `Batching (${batchingSuggestions.length})` },
        ]}
        style={styles.segButtons}
      />

      {/* Tab 1: Priority Queue */}
      {viewTab === 'queue' && (
        <View style={styles.tabContent}>
          <Text style={styles.tabHeader}>🚨 Needs Action (Highest Score First)</Text>
          {priorityQueueIssues.length === 0 ? (
            <Card style={styles.emptyCard} mode="contained">
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyText}>🎉 No pending issues need action!</Text>
              </Card.Content>
            </Card>
          ) : (
            priorityQueueIssues.map(item => (
              <TouchableOpacity
                key={item._id}
                onPress={() => router.push(`/(app)/complaints/admin/action/${item._id}` as any)}
              >
                <Card style={styles.queueCard} mode="elevated">
                  <Card.Content>
                    <View style={styles.queueHeader}>
                      <View style={styles.idGroup}>
                        <Text style={styles.queueId}>#{item.clusterNumber}</Text>
                        <Chip style={styles.statusChip} compact>{item.status}</Chip>
                      </View>
                      <Chip
                        style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priorityLevel) + '22' }]}
                        textStyle={{ color: getPriorityColor(item.priorityLevel), fontWeight: '700' }}
                        compact
                      >
                        {item.priorityLevel} ({item.priorityScore})
                      </Chip>
                    </View>

                    <Text style={styles.queueTitle}>{item.title}</Text>
                    <Text style={styles.queueLocation}>📍 {item.location?.specificArea} ({item.location?.block || 'Society'})</Text>

                    {item.priorityReason && (
                      <Text style={styles.queueReason}>🤖 {item.priorityReason}</Text>
                    )}

                    <Divider style={styles.queueDivider} />

                    <View style={styles.queueFooter}>
                      <Text style={styles.reportCountText}>👥 {item.reportCount} reports</Text>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => router.push(`/(app)/complaints/admin/action/${item._id}` as any)}
                      >
                        Take Action
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Tab 2: Kanban Board */}
      {viewTab === 'kanban' && (
        <ScrollView horizontal style={styles.kanbanScroll} contentContainerStyle={styles.kanbanContainer}>
          {kanbanColumns.map(col => {
            const colIssues = issues.filter(i => i.status === col.key);
            return (
              <View key={col.key} style={styles.kanbanCol}>
                <View style={[styles.colHeader, { borderLeftColor: col.color }]}>
                  <Text style={styles.colTitle}>{col.label}</Text>
                  <Chip style={styles.colBadge} compact>{colIssues.length}</Chip>
                </View>

                {colIssues.map(c => (
                  <TouchableOpacity
                    key={c._id}
                    onPress={() => router.push(`/(app)/complaints/admin/action/${c._id}` as any)}
                  >
                    <Card style={styles.kanbanCard} mode="contained">
                      <Card.Content>
                        <View style={styles.kanbanCardHeader}>
                          <Text style={styles.kanbanId}>#{c.clusterNumber}</Text>
                          <Text style={[styles.kanbanPrio, { color: getPriorityColor(c.priorityLevel) }]}>
                            {c.priorityLevel}
                          </Text>
                        </View>
                        <Text style={styles.kanbanTitle} numberOfLines={2}>{c.title}</Text>
                        <Text style={styles.kanbanLocation} numberOfLines={1}>📍 {c.location?.specificArea}</Text>
                        <Text style={styles.kanbanReports}>👥 {c.reportCount} reports</Text>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Tab 3: Batching Suggestions */}
      {viewTab === 'batching' && (
        <View style={styles.tabContent}>
          <Text style={styles.tabHeader}>💡 Work Order Batching Suggestions</Text>
          <Text style={styles.tabSubHeader}>
            Multiple open issues require the same trade. Contact one vendor for all to save costs and visits.
          </Text>

          {batchingSuggestions.length === 0 ? (
            <Card style={styles.emptyCard} mode="contained">
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyText}>No matching multi-issue trades right now.</Text>
              </Card.Content>
            </Card>
          ) : (
            batchingSuggestions.map((b, idx) => (
              <Card key={idx} style={styles.batchCard} mode="elevated">
                <Card.Content>
                  <View style={styles.batchHeader}>
                    <Text style={styles.batchTrade}>🛠️ Trade: {b.trade}</Text>
                    <Chip style={styles.batchChip} compact>{b.count} open issues</Chip>
                  </View>

                  <Text style={styles.batchSub}>Open issues in this trade:</Text>
                  {b.titles.map((t: string, i: number) => (
                    <Text key={i} style={styles.batchItem}>• {t}</Text>
                  ))}

                  {b.suggestedVendorNames && b.suggestedVendorNames.length > 0 && (
                    <Text style={styles.batchVendors}>
                      Suggested vendors: {b.suggestedVendorNames.join(', ')}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 12, paddingBottom: 60 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metricCard: { width: '48%', borderRadius: 10 },
  metricVal: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  metricLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  navBtn: { flex: 1, borderColor: '#CBD5E1' },
  segButtons: { marginBottom: 14 },
  tabContent: { marginTop: 4 },
  tabHeader: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  tabSubHeader: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 20 },
  emptyContent: { alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 14 },
  queueCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 10 },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  idGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  queueId: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  statusChip: { height: 24 },
  priorityChip: { height: 24 },
  queueTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  queueLocation: { fontSize: 12, color: '#475569', marginVertical: 3 },
  queueReason: { fontSize: 11, color: '#6366F1', fontStyle: 'italic', marginBottom: 6 },
  queueDivider: { marginVertical: 6 },
  queueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportCountText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  kanbanScroll: { flexGrow: 0 },
  kanbanContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  kanbanCol: { width: 220, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 8 },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 6, marginBottom: 8 },
  colTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  colBadge: { height: 22 },
  kanbanCard: { backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 8 },
  kanbanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kanbanId: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  kanbanPrio: { fontSize: 11, fontWeight: '700' },
  kanbanTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  kanbanLocation: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  kanbanReports: { fontSize: 11, color: '#475569' },
  batchCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 10 },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  batchTrade: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  batchChip: { backgroundColor: '#FEF3C7', height: 24 },
  batchSub: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  batchItem: { fontSize: 12, color: '#1E293B', marginLeft: 6, marginBottom: 2 },
  batchVendors: { fontSize: 11, color: '#0284C7', fontWeight: '600', marginTop: 6 },
});
