import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getCurrentlyInside,
  markManualVisitorExit,
  type ManualVisitorDto,
  type QrPassDto,
} from '../../../src/services/society-help';
import { useFocusEffect } from 'expo-router';

export default function CurrentlyInsideScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [manualVisitors, setManualVisitors] = useState<ManualVisitorDto[]>([]);
  const [passesInside, setPassesInside] = useState<QrPassDto[]>([]);
  const [totalInsideManual, setTotalInsideManual] = useState(0);
  const [totalInsidePasses, setTotalInsidePasses] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MANUAL' | 'PASSES'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await getCurrentlyInside();
      setManualVisitors(res.data.manualVisitors || []);
      setPassesInside(res.data.passesInside || []);
      setTotalInsideManual(res.data.totalInsideManual || 0);
      setTotalInsidePasses(res.data.totalInsidePasses || 0);
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

  const handle1TapExit = async (logId: string, visitorName: string) => {
    try {
      setActionLoadingId(logId);
      await markManualVisitorExit(logId);
      Alert.alert('Exit Recorded', `${visitorName} marked exited successfully.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record exit.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const grandTotal = totalInsideManual + totalInsidePasses;

  return (
    <View style={styles.container}>
      {/* Headcount Summary Header */}
      <View style={styles.headerCard}>
        <View style={styles.headcountBadge}>
          <Text style={styles.headcountNum}>{grandTotal}</Text>
          <Text style={styles.headcountLabel}>TOTAL PEOPLE INSIDE</Text>
        </View>
        <View style={styles.splitRow}>
          <View style={styles.splitBox}>
            <Text style={styles.splitNum}>{totalInsidePasses}</Text>
            <Text style={styles.splitLabel}>Via QR Passes</Text>
          </View>
          <View style={styles.splitBox}>
            <Text style={styles.splitNum}>{totalInsideManual}</Text>
            <Text style={styles.splitLabel}>Via Notepad</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['ALL', 'MANUAL', 'PASSES'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'ALL'
                ? `All (${grandTotal})`
                : tab === 'MANUAL'
                ? `Manual (${totalInsideManual})`
                : `QR Passes (${totalInsidePasses})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={
            activeTab === 'ALL'
              ? [
                  ...manualVisitors.map((m) => ({ ...m, itemType: 'MANUAL' as const })),
                  ...passesInside.map((p) => ({ ...p, itemType: 'PASS' as const })),
                ]
              : activeTab === 'MANUAL'
              ? manualVisitors.map((m) => ({ ...m, itemType: 'MANUAL' as const }))
              : passesInside.map((p) => ({ ...p, itemType: 'PASS' as const }))
          }
          keyExtractor={(item: any) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No visitors or passes currently inside</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            if (item.itemType === 'MANUAL') {
              const m = item as ManualVisitorDto;
              const isExiting = actionLoadingId === m._id;
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons
                        name={m.visitorType === 'DELIVERY' ? 'moped' : 'account'}
                        size={22}
                        color="#1E3A8A"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cardName}>{m.visitorName}</Text>
                      <Text style={styles.cardSubtitle}>
                        {m.visitorType === 'DELIVERY' ? `Delivery (${m.deliveryCompany || 'Courier'})` : m.purpose}
                      </Text>
                    </View>
                    <View style={styles.flatPill}>
                      <Text style={styles.flatPillText}>Flat {m.flatCode}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.timeText}>
                      In: {new Date(m.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {m.peopleCount} Person{m.peopleCount > 1 ? 's' : ''}
                    </Text>
                    {m.vehicleNumber ? (
                      <Text style={styles.timeText}>Vehicle: {m.vehicleNumber}</Text>
                    ) : null}
                  </View>

                  {/* 1-Tap Exit Button */}
                  <TouchableOpacity
                    style={styles.exitBtn}
                    onPress={() => handle1TapExit(m._id, m.visitorName)}
                    disabled={isExiting}
                  >
                    {isExiting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="logout" size={16} color="#FFFFFF" />
                        <Text style={styles.exitBtnText}>1-Tap Mark Exit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            } else {
              const p = item as QrPassDto;
              return (
                <View style={[styles.card, { borderColor: '#BFDBFE' }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                      <MaterialCommunityIcons name="qrcode" size={22} color="#1E40AF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cardName}>{p.visitorName || p.ownerName}</Text>
                      <Text style={[styles.cardSubtitle, { color: '#1E40AF' }]}>
                        {p.passType.replace('_', ' ')} • Code: {p.passCode}
                      </Text>
                    </View>
                    {p.flatCode ? (
                      <View style={styles.flatPill}>
                        <Text style={styles.flatPillText}>Flat {p.flatCode}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.timeText}>
                      Entered: {p.peopleEnteredTotal} • Exited: {p.peopleExitedTotal} •{' '}
                      <Text style={{ fontWeight: '700', color: '#16A34A' }}>
                        Inside: {p.peopleCurrentlyInside}
                      </Text>
                    </Text>
                    {p.serviceCategory ? (
                      <Text style={styles.timeText}>Service: {p.serviceCategory}</Text>
                    ) : null}
                  </View>
                </View>
              );
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerCard: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headcountBadge: { alignItems: 'center', marginBottom: 12 },
  headcountNum: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  headcountLabel: { fontSize: 12, fontWeight: '700', color: '#93C5FD', letterSpacing: 1 },
  splitRow: { flexDirection: 'row', gap: 10 },
  splitBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  splitNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  splitLabel: { fontSize: 11, color: '#BFDBFE', marginTop: 2 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#1E3A8A' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  flatPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  flatPillText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  cardBody: { marginTop: 10 },
  timeText: { fontSize: 12, color: '#475569', marginBottom: 2 },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  exitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
