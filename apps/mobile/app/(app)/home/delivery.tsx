import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Card, Text, Button, Surface, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';

export default function DeliveryHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Profile */}
        <Surface style={styles.headerSurface} elevation={2}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeText}>DELIVERY PARTNER CONSOLE</Text>
              <Text variant="headlineSmall" style={styles.nameText}>
                Ramana Delivery
              </Text>
              <Text style={styles.subText}>Green Valley Apartments • Verified Courier</Text>
            </View>
            <Avatar.Icon size={52} icon="truck-delivery" style={styles.avatar} color="#FFFFFF" />
          </View>
        </Surface>

        {/* Gate Protocol Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>Society Gate Entry Protocol</Text>
                <Text variant="bodySmall" style={styles.cardSub}>Security Desk Guidelines</Text>
              </View>
            </View>

            <View style={styles.protocolList}>
              <View style={styles.protocolItem}>
                <MaterialCommunityIcons name="numeric-1-circle" size={18} color="#2563EB" />
                <Text style={styles.protocolText}>
                  State your destination flat and delivery service (Amazon, Flipkart, Swiggy, Zomato, etc.) to the security guard.
                </Text>
              </View>
              <View style={styles.protocolItem}>
                <MaterialCommunityIcons name="numeric-2-circle" size={18} color="#2563EB" />
                <Text style={styles.protocolText}>
                  If the resident is away ("Nobody at home"), leave the parcel securely at the security guard's desk.
                </Text>
              </View>
              <View style={styles.protocolItem}>
                <MaterialCommunityIcons name="numeric-3-circle" size={18} color="#2563EB" />
                <Text style={styles.protocolText}>
                  Remember to notify the guard when exiting so the society headcount counter remains accurate.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Group Buying Bulk Deliveries */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>Society Bulk Deliveries</Text>
                <Text variant="bodySmall" style={styles.cardSub}>Group Buying Consignment Drop</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Delivering an official OneSociety group buy consignment? Check in with the gate guard to sign the delivery manifest and hand over bulk packages.
            </Text>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              buttonColor="#16A34A"
              icon="clipboard-list-outline"
              onPress={() => router.push('/(app)/group-orders' as never)}
            >
              Browse Active Orders
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
  badgeText: { fontSize: 11, fontWeight: '800', color: '#0F766E', letterSpacing: 0.8 },
  nameText: { fontWeight: '900', color: '#0F172A', marginTop: 2 },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  avatar: { backgroundColor: '#0F766E' },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontWeight: '800', color: '#0F172A' },
  cardSub: { color: '#64748B', marginTop: 1 },
  protocolList: { gap: 10, marginTop: 8 },
  protocolItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  protocolText: { flex: 1, fontSize: 12, color: '#334155', lineHeight: 18 },
  cardDesc: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4 },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
});
