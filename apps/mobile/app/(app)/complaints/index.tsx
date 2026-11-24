import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  Button,
  FAB,
  Banner,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getComplaintsFeed } from '../../../src/services/complaints';
import { useAuthStore } from '../../../src/store/auth';

const CATEGORIES = [
  'ALL',
  'Lift',
  'Water supply',
  'Electricity in common areas',
  'Drainage and plumbing in common areas',
  'Security',
  'Cleanliness and garbage',
  'Parking',
  'Garden and landscaping',
  'Fire safety',
  'Structural issues in common areas',
  'Clubhouse, gym, pool, and play area',
  'Other',
];

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'IN_PROGRESS', 'SOLVED', 'REOPENED', 'CLOSED'];

export default function ComplaintsFeedScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPresident = user?.role === 'president';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [myComplaintsOnly, setMyComplaintsOnly] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(true);

  const fetchIssues = useCallback(async () => {
    try {
      const res = await getComplaintsFeed({
        category: selectedCategory,
        status: selectedStatus,
        block: selectedBlock,
        myComplaintsOnly,
        search,
      });
      setIssues(res.data.feed || []);
    } catch (err) {
      console.error('Failed to fetch complaints feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus, selectedBlock, myComplaintsOnly, search]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIssues();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return '#6366F1';
      case 'CONTACTED':
        return '#0284C7';
      case 'IN_PROGRESS':
        return '#D97706';
      case 'SOLVED':
        return '#16A34A';
      case 'CLOSED':
        return '#475569';
      case 'REOPENED':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Emergency Notice Banner */}
      {emergencyVisible && (
        <Banner
          visible={emergencyVisible}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => setEmergencyVisible(false),
            },
          ]}
          icon="alert-octagon"
          style={styles.emergencyBanner}
        >
          <Text style={styles.emergencyText}>
            🚨 EMERGENCY: For fires, gas leaks, or people trapped in lifts, immediately call emergency security or use Emergency Gate Alert!
          </Text>
        </Banner>
      )}

      {/* President Shortcut Card */}
      {isPresident && (
        <Card style={styles.presidentCard} mode="contained" onPress={() => router.push('/(app)/complaints/admin' as any)}>
          <Card.Content style={styles.presidentContent}>
            <View>
              <Text style={styles.presidentTitle}>👑 President Control Center</Text>
              <Text style={styles.presidentSubtitle}>Manage priority queue, vendors & reports</Text>
            </View>
            <Button mode="contained" compact onPress={() => router.push('/(app)/complaints/admin' as any)}>
              Open
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <Searchbar
          placeholder="Search issues, lifts, water..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
        />

        {/* Quick Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Chip
            selected={myComplaintsOnly}
            onPress={() => setMyComplaintsOnly(!myComplaintsOnly)}
            style={styles.filterChip}
            icon="account"
          >
            My Complaints
          </Chip>
          <Chip
            selected={selectedBlock === 'ALL'}
            onPress={() => setSelectedBlock('ALL')}
            style={styles.filterChip}
          >
            All Blocks
          </Chip>
          {['A', 'B', 'C', 'D'].map(b => (
            <Chip
              key={b}
              selected={selectedBlock === b}
              onPress={() => setSelectedBlock(b)}
              style={styles.filterChip}
            >
              Block {b}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {STATUSES.map(s => (
            <Chip
              key={s}
              selected={selectedStatus === s}
              onPress={() => setSelectedStatus(s)}
              style={styles.filterChip}
            >
              {s}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CATEGORIES.map(c => (
            <Chip
              key={c}
              selected={selectedCategory === c}
              onPress={() => setSelectedCategory(c)}
              style={styles.filterChip}
            >
              {c}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : issues.length === 0 ? (
          <Card style={styles.emptyCard} mode="contained">
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>No Complaints Found</Text>
              <Text style={styles.emptySubtitle}>No open common area issues matching your filters.</Text>
            </Card.Content>
          </Card>
        ) : (
          issues.map(item => (
            <TouchableOpacity
              key={item._id}
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/complaints/${item._id}` as any)}
            >
              <Card style={styles.issueCard} mode="elevated">
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.clusterIdRow}>
                      <Text style={styles.clusterNumber}>#{item.clusterNumber}</Text>
                      <Chip
                        style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '18' }]}
                        textStyle={{ color: getStatusColor(item.status), fontWeight: '700', fontSize: 11 }}
                      >
                        {item.status}
                      </Chip>
                    </View>
                    <Chip
                      style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priorityLevel) + '22' }]}
                      textStyle={{ color: getPriorityColor(item.priorityLevel), fontWeight: '700', fontSize: 11 }}
                    >
                      {item.priorityLevel} ({item.priorityScore})
                    </Chip>
                  </View>

                  <Text style={styles.issueTitle}>{item.title}</Text>

                  <Text style={styles.locationText}>
                    📍 {item.location?.specificArea}
                    {item.location?.block ? ` • Block ${item.location.block}` : ''}
                    {item.location?.floor ? ` • Floor ${item.location.floor}` : ''}
                  </Text>

                  {item.priorityReason && (
                    <Text style={styles.reasonText} numberOfLines={2}>
                      🤖 AI Priority: {item.priorityReason}
                    </Text>
                  )}

                  <Divider style={styles.divider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsBadge}>
                        👥 {item.reportCount} report{item.reportCount > 1 ? 's' : ''} ({item.affectedResidentsCount} resident{item.affectedResidentsCount > 1 ? 's' : ''})
                      </Text>
                      <Text style={styles.statsBadge}>
                        🕒 {item.daysOpen === 0 ? 'Today' : `${item.daysOpen}d ago`}
                      </Text>
                    </View>

                    {item.assignedVendorName && (
                      <Text style={styles.vendorText}>🔧 {item.assignedVendorName}</Text>
                    )}

                    {item.costsTotalPaise > 0 && (
                      <Text style={styles.costText}>
                        💰 Rs. {(item.costsTotalPaise / 100).toLocaleString()}{' '}
                        {item.isPaid ? '• Paid' : '• Pending'}
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Report Issue"
        style={styles.fab}
        onPress={() => router.push('/(app)/complaints/new' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emergencyBanner: { backgroundColor: '#FEE2E2', borderBottomWidth: 1, borderBottomColor: '#FCA5A5' },
  emergencyText: { color: '#991B1B', fontWeight: '600', fontSize: 13 },
  presidentCard: { margin: 12, marginBottom: 4, backgroundColor: '#EEF2FF', borderRadius: 12 },
  presidentContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presidentTitle: { fontSize: 15, fontWeight: '700', color: '#312E81' },
  presidentSubtitle: { fontSize: 12, color: '#4338CA', marginTop: 2 },
  filterSection: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  searchbar: { elevation: 0, backgroundColor: '#FFFFFF', borderRadius: 10, height: 44, marginBottom: 8 },
  chipScroll: { marginBottom: 6 },
  filterChip: { marginRight: 6, height: 32 },
  listContent: { padding: 12, paddingBottom: 90 },
  loader: { marginTop: 40 },
  emptyCard: { marginTop: 40, backgroundColor: '#FFFFFF', borderRadius: 12 },
  emptyContent: { alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
  issueCard: { marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clusterIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clusterNumber: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  statusChip: { height: 26 },
  priorityChip: { height: 26 },
  issueTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#475569', marginBottom: 6 },
  reasonText: { fontSize: 12, color: '#6366F1', fontStyle: 'italic', marginBottom: 8 },
  divider: { marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statsBadge: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  vendorText: { fontSize: 12, color: '#0284C7', fontWeight: '600' },
  costText: { fontSize: 12, color: '#16A34A', fontWeight: '700' },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: '#2563EB' },
});
