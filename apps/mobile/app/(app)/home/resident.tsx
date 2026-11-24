import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { Card, Text, Button, Surface, Chip, Avatar, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import {
  getPresenceStatus,
  updatePresenceStatus,
  getMaintenanceDues,
  type MaintenanceDueDto,
} from '../../../src/services/society-help';

export default function ResidentHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [isAtHome, setIsAtHome] = useState<boolean>(true);
  const [loadingPresence, setLoadingPresence] = useState<boolean>(false);
  const [unpaidDues, setUnpaidDues] = useState<MaintenanceDueDto[]>([]);
  const [loadingDues, setLoadingDues] = useState<boolean>(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoadingPresence(true);
      const presRes = await getPresenceStatus();
      if (presRes.data?.isAtHome !== undefined) {
        setIsAtHome(presRes.data.isAtHome);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingPresence(false);
    }

    try {
      setLoadingDues(true);
      const duesRes = await getMaintenanceDues();
      const unpaid = (duesRes.data || []).filter((d: MaintenanceDueDto) => d.status !== 'PAID');
      setUnpaidDues(unpaid);
    } catch {
      // ignore
    } finally {
      setLoadingDues(false);
    }
  };

  const togglePresence = async () => {
    try {
      setLoadingPresence(true);
      const nextStatus = !isAtHome;
      await updatePresenceStatus({ isAtHome: nextStatus });
      setIsAtHome(nextStatus);
    } catch {
      Alert.alert('Error', 'Unable to update presence status');
    } finally {
      setLoadingPresence(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Resident Header Profile Card */}
        <Surface style={styles.profileHeader} elevation={2}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileInfo}>
              <Text style={styles.societyName}>Green Valley Apartments</Text>
              <Text variant="headlineSmall" style={styles.residentName}>
                Suresh Kumar
              </Text>
              <View style={styles.flatTagRow}>
                <Chip icon="home" style={styles.flatChip} textStyle={styles.flatChipText}>
                  Flat A-102 • Block A
                </Chip>
                <Chip icon="shield-check" style={styles.verifiedChip} textStyle={styles.verifiedChipText}>
                  Verified Member
                </Chip>
              </View>
            </View>
            <Avatar.Icon size={52} icon="account" style={styles.avatarIcon} color="#FFFFFF" />
          </View>

          {/* Quick Action Bar: Presence Toggle */}
          <View style={styles.quickBar}>
            {/* Presence Toggle */}
            <TouchableOpacity
              onPress={togglePresence}
              disabled={loadingPresence}
              style={[
                styles.presenceBtn,
                isAtHome ? styles.presenceHome : styles.presenceAway,
                { flex: 1 },
              ]}
              activeOpacity={0.8}
            >
              {loadingPresence ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={isAtHome ? 'home-account' : 'home-export-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.presenceLabel}>Someone at Home</Text>
                    <Text style={styles.presenceStatus}>
                      {isAtHome ? 'YES (Visitors Allowed)' : 'NO (Visitors Denied)'}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Maintenance Alert Strip */}
        {unpaidDues.length > 0 && (
          <Surface style={styles.duesAlert} elevation={1}>
            <View style={styles.duesAlertLeft}>
              <MaterialCommunityIcons name="cash-fast" size={24} color="#D97706" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.duesTitle}>Maintenance Due: ₹2,500</Text>
                <Text style={styles.duesSub}>Official receipt REC-YYYYMM-FLAT generated instantly</Text>
              </View>
            </View>
            <Button
              mode="contained"
              compact
              buttonColor="#D97706"
              onPress={() => router.push('/(app)/society-help/maintenance/pay' as never)}
            >
              Pay Now
            </Button>
          </Surface>
        )}

        {/* 5 Core Pillar Cards */}
        <Text style={styles.sectionHeader}>SOCIETY MODULES & SERVICES</Text>

        {/* 1. Society Help Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <MaterialCommunityIcons name="shield-home" size={24} color="#4F46E5" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text variant="titleMedium" style={styles.cardTitle}>Society Help</Text>
                <Text variant="bodySmall" style={styles.cardSub}>
                  Gate Security • Maintenance Accounts • Community Events
                </Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Show family QR pass at gate, create visitor passes with shareable links, view maintenance ledger with proof, and browse events.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="qrcode"
              onPress={() => router.push('/(app)/society-help/passes' as never)}
            >
              My QR Pass
            </Button>
            <Button
              mode="contained"
              buttonColor="#4F46E5"
              icon="open-in-new"
              onPress={() => router.push('/(app)/society-help' as never)}
            >
              Open Hub
            </Button>
          </Card.Actions>
        </Card>

        {/* 2. ServiceHub Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
                <MaterialCommunityIcons name="account-wrench" size={24} color="#0284C7" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text variant="titleMedium" style={styles.cardTitle}>ServiceHub (Skills)</Text>
                <Text variant="bodySmall" style={styles.cardSub}>
                  Verified Maids • Tutors • Repairs • Fitness
                </Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Hire verified society neighbours or external domestic help. Transparent schedules, negotiated pricing, and rating reviews.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="calendar-check"
              onPress={() => router.push('/(app)/services/my-services' as never)}
            >
              My Bookings
            </Button>
            <Button
              mode="contained"
              buttonColor="#0284C7"
              icon="magnify"
              onPress={() => router.push('/(app)/services' as never)}
            >
              Explore Services
            </Button>
          </Card.Actions>
        </Card>

        {/* 3. Smart Complaints Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D97706" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text variant="titleMedium" style={styles.cardTitle}>Smart Complaints</Text>
                <Text variant="bodySmall" style={styles.cardSub}>
                  Lifts • Water • Common Lights • AI Priority
                </Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Report common-area problems with photo proof. AI clusters identical reports together and the president tracks vendor quotes and repairs openly.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="plus-circle"
              onPress={() => router.push('/(app)/complaints/new' as never)}
            >
              Report Issue
            </Button>
            <Button
              mode="contained"
              buttonColor="#D97706"
              icon="format-list-bulleted"
              onPress={() => router.push('/(app)/complaints' as never)}
            >
              Complaints Feed
            </Button>
          </Card.Actions>
        </Card>

        {/* 4. Share & Rent Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#16A34A" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text variant="titleMedium" style={styles.cardTitle}>Share & Rent</Text>
                <Text variant="bodySmall" style={styles.cardSub}>
                  Tools • Projectors • Ladders • AI Verified Pricing
                </Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Borrow and lend household appliances from neighbours. Secure escrow deposits, dual pickup/return photo proof, and zero disputes.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="bullhorn-outline"
              onPress={() => router.push('/(app)/rentals/requests' as never)}
            >
              Wanted Board
            </Button>
            <Button
              mode="contained"
              buttonColor="#16A34A"
              icon="store"
              onPress={() => router.push('/(app)/rentals' as never)}
            >
              Browse & Share
            </Button>
          </Card.Actions>
        </Card>

        {/* 5. Group Buying Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="cart-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text variant="titleMedium" style={styles.cardTitle}>Group Buying</Text>
                <Text variant="bodySmall" style={styles.cardSub}>
                  Bulk Pool Demand • Tier Discounts • Gate Pickups
                </Text>
              </View>
            </View>
            <Text style={styles.cardBodyText}>
              Pool orders with neighbours to trigger wholesale volume discounts on groceries and essentials with automated escrow safety.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              buttonColor="#2563EB"
              icon="cart-outline"
              onPress={() => router.push('/(app)/group-orders' as never)}
            >
              Browse Bulk Orders
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { flexGrow: 1, padding: 16, paddingBottom: 28, gap: 14 },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileInfo: { flex: 1, paddingRight: 8 },
  societyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  residentName: { fontWeight: '900', color: '#0F172A', marginTop: 2 },
  flatTagRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  flatChip: { backgroundColor: '#EFF6FF', height: 28 },
  flatChipText: { fontSize: 11, color: '#1D4ED8', fontWeight: '700' },
  verifiedChip: { backgroundColor: '#F0FDF4', height: 28 },
  verifiedChipText: { fontSize: 11, color: '#15803D', fontWeight: '700' },
  avatarIcon: { backgroundColor: '#1565C0' },
  quickBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  presenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  presenceHome: { backgroundColor: '#16A34A' },
  presenceAway: { backgroundColor: '#DC2626' },
  presenceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  presenceStatus: { fontSize: 12, color: '#FFFFFF', fontWeight: '900' },
  sosBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
  },
  sosText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  duesAlert: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  duesAlertLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  duesTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  duesSub: { fontSize: 11, color: '#B45309', marginTop: 1 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: -4,
  },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardHeaderTexts: { flex: 1 },
  cardTitle: { fontWeight: '800', color: '#0F172A' },
  cardSub: { color: '#64748B', marginTop: 1 },
  cardBodyText: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4 },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
});
