import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Card, Text, Button, Surface, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';

export default function SupplierHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Profile */}
        <Surface style={styles.headerSurface} elevation={2}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeText}>VERIFIED SUPPLIER PORTAL</Text>
              <Text variant="headlineSmall" style={styles.nameText}>
                FreshFarm Organics
              </Text>
              <Text style={styles.subText}>Green Valley Bulk Purchasing Partner</Text>
            </View>
            <Avatar.Icon size={52} icon="storefront" style={styles.avatar} color="#FFFFFF" />
          </View>
        </Surface>

        {/* Group Buying Demand Windows */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="cart-outline" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>Society Group Orders</Text>
                <Text variant="bodySmall" style={styles.cardSub}>Submit Quotes & Fulfill Demand</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Review pooled resident demand when society windows close. Offer bulk wholesale pricing with automated escrow protection upon gate delivery.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              buttonColor="#2563EB"
              icon="cart-outline"
              onPress={() => router.push('/(app)/group-orders' as never)}
            >
              Browse Open Orders
            </Button>
          </Card.Actions>
        </Card>

        {/* Business Profile & GST */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="badge-account-horizontal" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>Business Profile & Compliance</Text>
                <Text variant="bodySmall" style={styles.cardSub}>GST Credentials & Society Approvals</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Ensure your business details, verified GST registration, and contact information remain up-to-date for society president reviews.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="account-box-outline"
              onPress={() => router.push('/(app)/suppliers/profile' as never)}
            >
              View Profile & GST
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
  badgeText: { fontSize: 11, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.8 },
  nameText: { fontWeight: '900', color: '#0F172A', marginTop: 2 },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  avatar: { backgroundColor: '#1E40AF' },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontWeight: '800', color: '#0F172A' },
  cardSub: { color: '#64748B', marginTop: 1 },
  cardDesc: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4 },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
});
