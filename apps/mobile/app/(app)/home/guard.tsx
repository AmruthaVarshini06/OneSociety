import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Card, Text, Button, Surface, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { getLiveGateDashboard } from '../../../src/services/society-help';

export default function GuardHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [headcount, setHeadcount] = useState<number>(4);

  useEffect(() => {
    loadGateSummary();
  }, []);

  const loadGateSummary = async () => {
    try {
      const res = await getLiveGateDashboard();
      if (res.data?.totalInside !== undefined) {
        setHeadcount(res.data.totalInside);
      }
    } catch {
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Surface style={styles.headerSurface} elevation={2}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeText}>GATE SECURITY COMMAND</Text>
              <Text variant="headlineSmall" style={styles.guardName}>
                Ramu Guard (Gate 1)
              </Text>
              <Text style={styles.subText}>Gate 1 • Green Valley Main Security Desk</Text>
            </View>
            <Avatar.Icon size={52} icon="shield-account" style={styles.avatar} color="#FFFFFF" />
          </View>

          {}
          <View style={styles.headcountBanner}>
            <View style={styles.liveDot} />
            <Text style={styles.headcountLabel}>SOCIETY HEADCOUNT NOW:</Text>
            <Text style={styles.headcountValue}>{headcount} People Inside</Text>
          </View>
        </Surface>

        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <MaterialCommunityIcons name="shield-lock" size={24} color="#1E3A8A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Live Gate Security Stream
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  Real-time entry/exit logs & active pass scanner
                </Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              View continuous gate events, smart direction suggestion, and live society headcount statistics.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              icon="qrcode-scan"
              buttonColor="#1E3A8A"
              onPress={() => router.push('/(app)/guard/gate-dashboard' as never)}
              style={styles.actionBtn}
            >
              Open Gate Dashboard
            </Button>
          </Card.Actions>
        </Card>

        {}
        <Text style={styles.sectionTitle}>QUICK SECURITY ACTIONS</Text>
        <View style={styles.actionGrid}>
          <Button
            mode="contained-tonal"
            icon="camera"
            onPress={() => router.push('/(app)/guard/scan' as never)}
            style={styles.gridBtn}
          >
            Scan Pass
          </Button>
          <Button
            mode="contained-tonal"
            icon="notebook-edit"
            onPress={() => router.push('/(app)/guard/manual-log' as never)}
            style={styles.gridBtn}
          >
            Visitor Notepad
          </Button>
          <Button
            mode="contained-tonal"
            icon="account-group"
            onPress={() => router.push('/(app)/guard/currently-inside' as never)}
            style={styles.gridBtn}
          >
            Inside (1-Tap Exit)
          </Button>
          <Button
            mode="contained-tonal"
            icon="home-search"
            onPress={() => router.push('/(app)/guard/flat-search' as never)}
            style={styles.gridBtn}
          >
            Flat Presence
          </Button>
        </View>

        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Today's Society Events & Notes
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  Check flat guest numbers, sound limits & handover
                </Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Review gatherings past 22:00, monitor expected vehicle arrivals, and view official guard salary slips.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="calendar"
              onPress={() => router.push('/(app)/guard/events' as never)}
            >
              Events
            </Button>
            <Button
              mode="outlined"
              icon="transfer"
              onPress={() => router.push('/(app)/guard/handover' as never)}
            >
              Handover
            </Button>
            <Button
              mode="contained"
              buttonColor="#059669"
              icon="cash-check"
              onPress={() => router.push('/(app)/guard/salary' as never)}
            >
              My Salary
            </Button>
          </Card.Actions>
        </Card>

        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                <MaterialCommunityIcons name="truck-delivery" size={24} color="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Group Buying Gate Consignments
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  Accept supplier consignments & verify resident pickups
                </Text>
              </View>
            </View>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              icon="clipboard-check"
              buttonColor="#475569"
              onPress={() => router.push('/(app)/guard/deliveries' as never)}
              style={styles.actionBtn}
            >
              Open Gate Deliveries & Pickups
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
  headerSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 0.8 },
  guardName: { fontWeight: '900', color: '#0F172A', marginTop: 2 },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  avatar: { backgroundColor: '#1E3A8A' },
  headcountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  headcountLabel: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  headcountValue: { fontSize: 13, fontWeight: '900', color: '#16A34A', marginLeft: 'auto' },
  sectionTitle: {
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
  cardTitle: { fontWeight: '800', color: '#0F172A' },
  cardSubtitle: { color: '#64748B', marginTop: 1 },
  cardDesc: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4 },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  actionBtn: { borderRadius: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridBtn: { flexGrow: 1, minWidth: '45%', borderRadius: 10 },
});
