import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getEventsDashboard, type CommunityEventDto } from '../../../src/services/society-help';
import { useFocusEffect } from 'expo-router';

export default function GuardEventsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CommunityEventDto[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CommunityEventDto[]>([]);

  const loadData = async () => {
    try {
      const res = await getEventsDashboard();
      setTodayEvents(res.data.today || []);
      setUpcomingEvents(res.data.upcoming || []);
    } catch {
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
      <Text style={styles.headerTitle}>Society Events & Gatherings</Text>
      <Text style={styles.headerSubtitle}>
        Anticipate visitor influx, parking demand, and sound volume limits.
      </Text>

      {}
      <View style={styles.sectionHeaderRow}>
        <MaterialCommunityIcons name="calendar-today" size={18} color="#1E3A8A" />
        <Text style={styles.sectionTitle}>Today's Active Events ({todayEvents.length})</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
      ) : todayEvents.length > 0 ? (
        todayEvents.map((ev) => (
          <View key={ev._id} style={styles.activeCard}>
            <View style={styles.cardTop}>
              <View style={styles.flatBadge}>
                <Text style={styles.flatBadgeText}>Flat {ev.hostFlatCode}</Text>
              </View>
              <Text style={styles.eventTime}>
                {ev.dailyTimeFrom} - {ev.dailyTimeTo}
              </Text>
            </View>

            <Text style={styles.eventTitle}>{ev.title}</Text>
            <Text style={styles.eventType}>{ev.eventType}</Text>

            {}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="account-group" size={16} color="#1E3A8A" />
                <Text style={styles.metricLabel}>Expected Visitors:</Text>
                <Text style={styles.metricVal}>{ev.estimatedVisitors}</Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="car" size={16} color="#059669" />
                <Text style={styles.metricLabel}>Vehicles:</Text>
                <Text style={styles.metricVal}>{ev.expectedVehicles}</Text>
              </View>
            </View>

            {}
            {ev.hasLoudSound ? (
              <View style={styles.soundWarning}>
                <MaterialCommunityIcons name="volume-high" size={16} color="#B45309" />
                <Text style={styles.soundText}>
                  Loud Sound ({ev.loudSoundType || 'Music'}) till {ev.loudSoundEndTime || ev.dailyTimeTo}
                </Text>
              </View>
            ) : null}

            {ev.isQuietHoursFlagged ? (
              <View style={styles.quietFlag}>
                <MaterialCommunityIcons name="alert" size={16} color="#DC2626" />
                <Text style={styles.quietText}>
                  Quiet Hours Alert: Sound permitted strictly till 10:00 PM!
                </Text>
              </View>
            ) : null}

            {ev.presidentNotes ? (
              <View style={styles.presNote}>
                <Text style={styles.presNoteTitle}>President Instruction:</Text>
                <Text style={styles.presNoteText}>{ev.presidentNotes}</Text>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No events scheduled for today</Text>
        </View>
      )}

      {}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color="#475569" />
        <Text style={[styles.sectionTitle, { color: '#475569' }]}>
          Upcoming Events ({upcomingEvents.length})
        </Text>
      </View>

      {upcomingEvents.map((ev) => (
        <View key={ev._id} style={styles.upcomingCard}>
          <View style={styles.cardTop}>
            <View style={[styles.flatBadge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.flatBadgeText, { color: '#475569' }]}>Flat {ev.hostFlatCode}</Text>
            </View>
            <Text style={styles.eventTime}>
              {new Date(ev.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.upcomingTitle}>{ev.title}</Text>
          <Text style={styles.upcomingSub}>
            {ev.eventType} • ~{ev.estimatedVisitors} visitors • {ev.dailyTimeFrom} - {ev.dailyTimeTo}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flatBadgeText: { fontSize: 13, fontWeight: '800', color: '#1E40AF' },
  eventTime: { fontSize: 13, fontWeight: '700', color: '#475569' },
  eventTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  eventType: { fontSize: 13, color: '#64748B', marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { fontSize: 12, color: '#64748B' },
  metricVal: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  soundWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  soundText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  quietFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  quietText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  presNote: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presNoteTitle: { fontSize: 11, fontWeight: '700', color: '#475569' },
  presNoteText: { fontSize: 12, color: '#1E293B', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { color: '#94A3B8', fontSize: 13 },
  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  upcomingTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginTop: 6 },
  upcomingSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
