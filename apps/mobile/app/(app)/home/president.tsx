import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Surface, Chip, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { getLiveGateDashboard, getMaintenanceAccounts } from '../../../src/services/society-help';

export default function PresidentHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [headcount, setHeadcount] = useState<number>(4);
  const [balanceRupees, setBalanceRupees] = useState<number>(142500);

  useEffect(() => {
    loadPresidentKpis();
  }, []);

  const loadPresidentKpis = async () => {
    try {
      const gateRes = await getLiveGateDashboard();
      if (gateRes.data?.totalInside !== undefined) {
        setHeadcount(gateRes.data.totalInside);
      }
    } catch {
    }

    try {
      const finRes = await getMaintenanceAccounts();
      if (finRes.data?.currentBalancePaise !== undefined) {
        setBalanceRupees(Math.round(finRes.data.currentBalancePaise / 100));
      }
    } catch {
    }
  };

  const adminModules = [
    {
      title: 'Society Help & Maintenance Accounts',
      category: 'GATE, FINANCE & EVENTS',
      subtitle: 'Audit financial ledger with mandatory bill photos · Pay guard salaries · Public resident Q&A',
      icon: 'shield-account',
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5',
      btnColor: '#4F46E5',
      primaryAction: {
        label: 'Financial Ledger',
        onPress: () => router.push('/(app)/society-help/admin/maintenance-control' as never),
      },
      secondaryAction: {
        label: 'Resident Queries',
        onPress: () => router.push('/(app)/society-help/admin/queries' as never),
      },
    },
    {
      title: 'Smart Complaints Control',
      category: 'FACILITY REPAIRS',
      subtitle: 'AI duplicate issue clusters (Lift, Water, Electricity) · Direct vendor quotation & repair tracking',
      icon: 'alert-decagram',
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      btnColor: '#D97706',
      primaryAction: {
        label: 'Complaints Queue',
        onPress: () => router.push('/(app)/complaints/admin' as never),
      },
      secondaryAction: {
        label: 'Vendors & Rates',
        onPress: () => router.push('/(app)/complaints/admin/vendors' as never),
      },
    },
    {
      title: 'ServiceHub Provider Control',
      category: 'SKILLS MARKETPLACE',
      subtitle: 'Verify external domestic help & tutors · Issue temporary & permanent passes · Resolve provider disputes',
      icon: 'account-wrench',
      iconBg: '#F0F9FF',
      iconColor: '#0284C7',
      btnColor: '#0284C7',
      primaryAction: {
        label: 'Manage Providers',
        onPress: () => router.push('/(app)/services/admin' as never),
      },
      secondaryAction: {
        label: 'Verification Queue',
        onPress: () => router.push('/(app)/services/admin/verification-queue' as never),
      },
    },
    {
      title: 'Share & Rent Oversight',
      category: 'NEIGHBOURHOOD SHARING',
      subtitle: 'Review contested item prices · Monitor safe escrow security deposits · Mediate item damage claims',
      icon: 'swap-horizontal-bold',
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      btnColor: '#16A34A',
      primaryAction: {
        label: 'Price Appeals Queue',
        onPress: () => router.push('/(app)/rentals/admin/reviews' as never),
      },
      secondaryAction: {
        label: 'Dispute Settlement',
        onPress: () => router.push('/(app)/rentals/admin/disputes' as never),
      },
    },
    {
      title: 'Group Buying & Suppliers',
      category: 'BULK ORDERS',
      subtitle: 'Verify supplier GST credentials · Open demand windows · Supervise gate delivery manifests',
      icon: 'cart-outline',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      btnColor: '#2563EB',
      primaryAction: {
        label: 'Manage Suppliers',
        onPress: () => router.push('/(app)/suppliers' as never),
      },
      secondaryAction: {
        label: 'Bulk Orders',
        onPress: () => router.push('/(app)/group-orders' as never),
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Surface style={styles.headerSurface} elevation={2}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeText}>SOCIETY PRESIDENT & ADMINISTRATOR</Text>
              <Text variant="headlineSmall" style={styles.presidentName}>
                Ramesh Naidu
              </Text>
              <Text style={styles.subText}>Flat A-101 • Green Valley Apartments</Text>
            </View>
            <Avatar.Icon size={52} icon="crown" style={styles.crownAvatar} color="#FFFFFF" />
          </View>

          {}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <MaterialCommunityIcons name="account-group" size={20} color="#4F46E5" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.kpiLabel}>People Inside</Text>
                <Text style={styles.kpiValue}>{headcount} inside</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <MaterialCommunityIcons name="wallet" size={20} color="#16A34A" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.kpiLabel}>Treasury Balance</Text>
                <Text style={styles.kpiValue}>₹{balanceRupees.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </Surface>

        <Text style={styles.sectionTitle}>ADMINISTRATION COMMAND MODULES</Text>

        {}
        {adminModules.map((m) => (
          <Card key={m.title} style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconBox, { backgroundColor: m.iconBg }]}>
                  <MaterialCommunityIcons name={m.icon as any} size={24} color={m.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryTag, { color: m.iconColor }]}>{m.category}</Text>
                  <Text variant="titleMedium" style={styles.cardTitle}>{m.title}</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>{m.subtitle}</Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              {m.secondaryAction && (
                <Button mode="outlined" compact onPress={m.secondaryAction.onPress}>
                  {m.secondaryAction.label}
                </Button>
              )}
              <Button
                mode="contained"
                compact
                buttonColor={m.btnColor}
                onPress={m.primaryAction.onPress}
              >
                {m.primaryAction.label}
              </Button>
            </Card.Actions>
          </Card>
        ))}
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6A1B9A',
    letterSpacing: 0.8,
  },
  presidentName: { fontWeight: '900', color: '#0F172A', marginTop: 2 },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  crownAvatar: { backgroundColor: '#6A1B9A' },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    borderRadius: 12,
  },
  kpiLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  kpiValue: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginTop: 1 },
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
  categoryTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cardTitle: { fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4 },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
});
