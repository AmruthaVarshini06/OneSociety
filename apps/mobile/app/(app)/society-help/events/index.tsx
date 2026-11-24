import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getEventsDashboard, type CommunityEventDto } from '../../../../src/services/society-help';
import { useRouter, useFocusEffect } from 'expo-router';

export default function EventsIndexScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'TODAY' | 'UPCOMING' | 'PAST'>('TODAY');
  const [events, setEvents] = useState<{
    today: CommunityEventDto[];
    upcoming: CommunityEventDto[];
    past: CommunityEventDto[];
  }>({ today: [], upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await getEventsDashboard();
      setEvents(res.data);
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

  const currentList =
    activeTab === 'TODAY'
      ? events.today
      : activeTab === 'UPCOMING'
      ? events.upcoming
      : events.past;

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['TODAY', 'UPCOMING', 'PAST'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'TODAY'
                ? `Today (${events.today.length})`
                : tab === 'UPCOMING'
                ? `Upcoming (${events.upcoming.length})`
                : `Past (${events.past.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
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
        {loading ? (
          <ActivityIndicator color="#1E3A8A" style={{ marginTop: 40 }} />
        ) : currentList.length > 0 ? (
          currentList.map((ev) => (
            <View key={ev._id} style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <View style={styles.flatPill}>
                  <Text style={styles.flatPillText}>Flat {ev.hostFlatCode}</Text>
                </View>
                <Text style={styles.eventDate}>
                  {new Date(ev.startDate).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  • {ev.dailyTimeFrom} - {ev.dailyTimeTo}
                </Text>
              </View>

              <Text style={styles.eventTitle}>{ev.title}</Text>
              <Text style={styles.eventType}>{ev.eventType}</Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-group" size={16} color="#1E3A8A" />
                  <Text style={styles.statText}>
                    Visitors: {ev.guestsEnteredCount || 0} entered / ~{ev.estimatedVisitors} exp
                  </Text>
                </View>
                {ev.expectedVehicles ? (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="car" size={16} color="#059669" />
                    <Text style={styles.statText}>Vehicles: {ev.expectedVehicles}</Text>
                  </View>
                ) : null}
              </View>

              {/* Sound / Quiet Hours Badges */}
              {ev.hasLoudSound ? (
                <View style={styles.soundBadge}>
                  <MaterialCommunityIcons name="volume-high" size={16} color="#B45309" />
                  <Text style={styles.soundBadgeText}>
                    Loud sound ({ev.loudSoundType || 'Music'}) permitted till {ev.loudSoundEndTime}
                  </Text>
                </View>
              ) : null}

              {ev.isQuietHoursFlagged ? (
                <View style={styles.quietBadge}>
                  <MaterialCommunityIcons name="alert" size={16} color="#DC2626" />
                  <Text style={styles.quietBadgeText}>
                    {ev.quietHoursWarning || 'Quiet Hours Alert: Loud noise not permitted past 10 PM'}
                  </Text>
                </View>
              ) : null}

              {/* Over-Estimate Warning Alert */}
              {ev.isOverEstimateAlertSent ? (
                <View style={styles.overEstBadge}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#C2410C" />
                  <Text style={styles.overEstText}>
                    Headcount Alert: Guests have exceeded 115% of estimate!
                  </Text>
                </View>
              ) : null}

              {/* President Official Note */}
              {ev.presidentNotes ? (
                <View style={styles.presBox}>
                  <Text style={styles.presTitle}>President Note:</Text>
                  <Text style={styles.presText}>{ev.presidentNotes}</Text>
                </View>
              ) : null}

              {/* Guest Pass Share Button */}
              {ev.guestPassCode ? (
                <TouchableOpacity
                  style={styles.sharePassBtn}
                  onPress={() => {
                    Alert.alert(
                      'Event Guest Pass',
                      `Pass Code: ${ev.guestPassCode}\n\nShare this pass code with all your guests. The guard will scan this single pass for all incoming visitors to your event!`
                    );
                  }}
                >
                  <MaterialCommunityIcons name="qrcode" size={16} color="#1E3A8A" />
                  <Text style={styles.sharePassText}>
                    Event Guest Pass: {ev.guestPassCode} (Tap to Share)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="party-popper" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No events in this tab</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Event Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/society-help/events/new')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Announce Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#1E3A8A' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabLabelActive: { color: '#1E3A8A' },
  content: { padding: 16, paddingBottom: 80 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatPill: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  flatPillText: { fontSize: 12, fontWeight: '800', color: '#1E40AF' },
  eventDate: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  eventTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  eventType: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#334155' },
  soundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  soundBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  quietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  quietBadgeText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  overEstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  overEstText: { fontSize: 12, fontWeight: '700', color: '#C2410C' },
  presBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  presTitle: { fontSize: 11, fontWeight: '700', color: '#475569' },
  presText: { fontSize: 12, color: '#1E293B', marginTop: 2 },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sharePassText: { fontSize: 13, fontWeight: '800', color: '#1E3A8A' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, fontSize: 14, color: '#94A3B8' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1E3A8A',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
