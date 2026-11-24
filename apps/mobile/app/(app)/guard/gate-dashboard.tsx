import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getLiveGateDashboard,
  type GateDashboardDto,
} from '../../../src/services/society-help';
import { useRouter, useFocusEffect } from 'expo-router';

export default function GateDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<GateDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await getLiveGateDashboard();
      setData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        />
      }
    >
      {/* Quick Action Navigation Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#1E3A8A' }]}
          onPress={() => router.push('/(app)/guard/scan')}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={28} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Scan Pass</Text>
          <Text style={styles.actionCardSubtitle}>Verify QR / Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#0284C7' }]}
          onPress={() => router.push('/(app)/guard/manual-log')}
        >
          <MaterialCommunityIcons name="notebook-edit" size={28} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Visitor Notepad</Text>
          <Text style={styles.actionCardSubtitle}>Manual & Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#0D9488' }]}
          onPress={() => router.push('/(app)/guard/currently-inside')}
        >
          <MaterialCommunityIcons name="account-group" size={28} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Currently Inside</Text>
          <Text style={styles.actionCardSubtitle}>1-Tap Mark Exit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#475569' }]}
          onPress={() => router.push('/(app)/guard/flat-search')}
        >
          <MaterialCommunityIcons name="home-search" size={28} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Check Presence</Text>
          <Text style={styles.actionCardSubtitle}>Search Flat Status</Text>
        </TouchableOpacity>
      </View>

      {/* Headcount Stat Card */}
      <View style={styles.headcountCard}>
        <View style={styles.headcountHeader}>
          <Text style={styles.headcountTitle}>Live Society Head-Count</Text>
          <View style={styles.liveBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.headcountNumber}>{data?.totalInside ?? 0}</Text>
        <Text style={styles.headcountSub}>Total Valid Persons Currently Inside</Text>

        {/* 4 Category Breakdown Pills */}
        <View style={styles.pillsRow}>
          <View style={styles.pillBox}>
            <MaterialCommunityIcons name="home-account" size={18} color="#1E3A8A" />
            <Text style={styles.pillNum}>{data?.breakdown?.residents ?? 0}</Text>
            <Text style={styles.pillLabel}>Residents</Text>
          </View>
          <View style={styles.pillBox}>
            <MaterialCommunityIcons name="account-multiple" size={18} color="#D97706" />
            <Text style={styles.pillNum}>{data?.breakdown?.visitors ?? 0}</Text>
            <Text style={styles.pillLabel}>Visitors</Text>
          </View>
          <View style={styles.pillBox}>
            <MaterialCommunityIcons name="hammer-wrench" size={18} color="#059669" />
            <Text style={styles.pillNum}>{data?.breakdown?.providers ?? 0}</Text>
            <Text style={styles.pillLabel}>Providers</Text>
          </View>
          <View style={styles.pillBox}>
            <MaterialCommunityIcons name="moped" size={18} color="#7C3AED" />
            <Text style={styles.pillNum}>{data?.breakdown?.delivery ?? 0}</Text>
            <Text style={styles.pillLabel}>Delivery</Text>
          </View>
        </View>
      </View>

      {/* Alerts Box */}
      {data?.alerts && data.alerts.length > 0 ? (
        <View style={styles.alertCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="alert" size={20} color="#DC2626" />
            <Text style={styles.alertHeader}>Active Gate Alerts ({data.alerts.length})</Text>
          </View>
          {data.alerts.map((al: string, idx: number) => (
            <Text key={idx} style={styles.alertItem}>
              • {al}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Live Stream: Recent Events */}
      <View style={styles.streamSection}>
        <View style={styles.streamHeader}>
          <Text style={styles.streamTitle}>Recent Gate Entries & Exits</Text>
          <TouchableOpacity onPress={() => loadData()}>
            <MaterialCommunityIcons name="refresh" size={20} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
        ) : data?.recentEvents && data.recentEvents.length > 0 ? (
          data.recentEvents.map((ev: any, idx: number) => (
            <View key={ev._id || ev.id || idx} style={styles.eventRow}>
              <View
                style={[
                  styles.dirIcon,
                  ev.direction === 'ENTRY'
                    ? { backgroundColor: '#DCFCE7' }
                    : { backgroundColor: '#FEE2E2' },
                ]}
              >
                <MaterialCommunityIcons
                  name={ev.direction === 'ENTRY' ? 'arrow-down-bold' : 'arrow-up-bold'}
                  size={18}
                  color={ev.direction === 'ENTRY' ? '#16A34A' : '#DC2626'}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.eventMain}>
                  {ev.visitorOrOwnerName}{' '}
                  {ev.flatCode ? <Text style={styles.flatTag}>({ev.flatCode})</Text> : null}
                </Text>
                <Text style={styles.eventSub}>
                  {ev.passType} • {ev.passCode}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.eventDirBadge,
                    ev.direction === 'ENTRY' ? { color: '#16A34A' } : { color: '#DC2626' },
                  ]}
                >
                  {ev.direction} +{ev.count}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(ev.scannedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No gate events recorded yet today</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 8 },
  actionCardSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  headcountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  headcountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headcountTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  headcountNumber: { fontSize: 44, fontWeight: '900', color: '#1E3A8A', marginTop: 8 },
  headcountSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pillBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillNum: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  pillLabel: { fontSize: 10, color: '#64748B', marginTop: 1 },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  alertHeader: { fontSize: 13, fontWeight: '800', color: '#991B1B', marginLeft: 6 },
  alertItem: { fontSize: 12, color: '#7F1D1D', marginTop: 4, lineHeight: 16 },
  streamSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  streamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  streamTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dirIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  eventMain: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  flatTag: { fontWeight: '600', color: '#64748B' },
  eventSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  eventDirBadge: { fontSize: 13, fontWeight: '800' },
  eventTime: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 16, fontSize: 13 },
});
