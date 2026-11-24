import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPresenceStatus,
  updatePresenceStatus,
  getMaintenanceAccounts,
  getMaintenanceDues,
  type FlatPresenceDto,
} from '../../../src/services/society-help';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';

export default function SocietyHelpIndexScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [presence, setPresence] = useState<FlatPresenceDto | null>(null);
  const [loadingPresence, setLoadingPresence] = useState(true);
  const [updatingPresence, setUpdatingPresence] = useState(false);
  const [pendingDue, setPendingDue] = useState<any | null>(null);
  const [balanceRs, setBalanceRs] = useState<number | null>(null);

  const loadData = async () => {
    try {
      if (user?.role === 'resident') {
        const presRes = await getPresenceStatus();
        setPresence(presRes.data);

        const duesRes = await getMaintenanceDues();
        const pending = (duesRes.data || []).find((d) => d.status !== 'PAID');
        setPendingDue(pending || null);
      }

      const accRes = await getMaintenanceAccounts();
      setBalanceRs(Math.round((accRes.data.currentBalancePaise || 0) / 100));
    } catch {
    } finally {
      setLoadingPresence(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleTogglePresence = async (newVal: boolean) => {
    try {
      setUpdatingPresence(true);
      const res = await updatePresenceStatus({ isAtHome: newVal });
      setPresence(res.data);
      Alert.alert(
        'Presence Updated',
        newVal
          ? 'Flat marked as "Someone is at home". Visitors and deliveries are welcome!'
          : 'Flat marked as "Nobody is at home". Visitors will be blocked at the gate.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update presence.');
    } finally {
      setUpdatingPresence(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {}
      {user?.role === 'resident' && presence ? (
        <View
          style={[
            styles.presenceCard,
            presence.isAtHome ? styles.presenceHome : styles.presenceAway,
          ]}
        >
          <View style={styles.presenceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.presenceTitle}>
                {presence.isAtHome ? '🏡 Someone is at home' : '🔒 Nobody is at home'}
              </Text>
              <Text style={styles.presenceSub}>
                Flat {presence.flatCode} •{' '}
                {presence.isAtHome
                  ? 'Visitors & deliveries allowed'
                  : 'Visitors blocked at gate. Parcels accepted at gate.'}
              </Text>
            </View>
            {updatingPresence ? (
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : (
              <Switch
                value={presence.isAtHome}
                onValueChange={handleTogglePresence}
                trackColor={{ false: '#FECACA', true: '#BBF7D0' }}
                thumbColor={presence.isAtHome ? '#16A34A' : '#DC2626'}
              />
            )}
          </View>
        </View>
      ) : null}

      {}
      {pendingDue ? (
        <TouchableOpacity
          style={styles.dueBanner}
          onPress={() => router.push('/(app)/society-help/maintenance/pay')}
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.dueBannerTitle}>Maintenance Due: {pendingDue.billingMonth}</Text>
            <Text style={styles.dueBannerSub}>
              ₹{(pendingDue.amountPaise / 100).toLocaleString('en-IN')} pending • Pay now with receipt
            </Text>
          </View>
          <View style={styles.payNowBtn}>
            <Text style={styles.payNowText}>Pay</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {}
      <Text style={styles.sectionHeader}>Society Help Services</Text>

      {}
      <TouchableOpacity
        style={styles.pillarCard}
        onPress={() => router.push('/(app)/society-help/passes')}
      >
        <View style={[styles.pillarIcon, { backgroundColor: '#DBEAFE' }]}>
          <MaterialCommunityIcons name="qrcode-scan" size={26} color="#1E40AF" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.pillarTitle}>Gate Passes & Visitors</Text>
          <Text style={styles.pillarDesc}>
            Family QR pass, create visitor passes with links, track entry/exit times.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>

      {}
      <TouchableOpacity
        style={styles.pillarCard}
        onPress={() => router.push('/(app)/society-help/maintenance')}
      >
        <View style={[styles.pillarIcon, { backgroundColor: '#DCFCE7' }]}>
          <MaterialCommunityIcons name="chart-pie" size={26} color="#15803D" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.pillarTitle}>Maintenance Money</Text>
          <Text style={styles.pillarDesc}>
            {balanceRs !== null ? `Fund Balance: ₹${balanceRs.toLocaleString('en-IN')}` : 'Loading...'} •
            Every rupee with proof & queries.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>

      {}
      <TouchableOpacity
        style={styles.pillarCard}
        onPress={() => router.push('/(app)/society-help/events')}
      >
        <View style={[styles.pillarIcon, { backgroundColor: '#FEF3C7' }]}>
          <MaterialCommunityIcons name="party-popper" size={26} color="#B45309" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.pillarTitle}>Community Events</Text>
          <Text style={styles.pillarDesc}>
            Announce birthdays, pujas, gatherings. Single guest pass with headcount alert.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>

      {}
      {user?.role === 'president' ? (
        <View style={styles.presidentBox}>
          <Text style={styles.presidentBoxTitle}>President Controls</Text>
          <View style={styles.presBtnRow}>
            <TouchableOpacity
              style={styles.presBtn}
              onPress={() => router.push('/(app)/society-help/admin/maintenance-control')}
            >
              <MaterialCommunityIcons name="calculator" size={20} color="#1E3A8A" />
              <Text style={styles.presBtnText}>Record Expense / Payroll</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presBtn}
              onPress={() => router.push('/(app)/society-help/admin/queries')}
            >
              <MaterialCommunityIcons name="comment-question" size={20} color="#1E3A8A" />
              <Text style={styles.presBtnText}>Resident Queries</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  presenceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  presenceHome: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  presenceAway: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  presenceHeader: { flexDirection: 'row', alignItems: 'center' },
  presenceTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  presenceSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  dueBannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  dueBannerSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  payNowBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payNowText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pillarIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillarTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  pillarDesc: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 16 },
  presidentBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  presidentBoxTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 },
  presBtnRow: { flexDirection: 'row', gap: 10 },
  presBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  presBtnText: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
});
