import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyDeliveryPass, verifyDeliveryQr } from '../../../src/services/delivery';

export default function ResidentPickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-delivery-pass', id],
    queryFn: () => getMyDeliveryPass(id),
    enabled: !!id,
  });

  const pass = data?.pass;

  const verifyMutation = useMutation({
    mutationFn: (token: string) => verifyDeliveryQr(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-delivery-pass', id] });
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      Alert.alert('Delivery Confirmed!', 'Your package delivery has been verified successfully.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? err.message ?? 'Verification failed';
      Alert.alert('Verification Error', msg);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading delivery pass...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !pass) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>No Delivery Pass Found</Text>
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 8 }]}>
          Your delivery pass will be generated once the supplier dispatches the order.
        </Text>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 24 }}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const isDelivered = pass.status === 'DELIVERED';
  const isAtGate = pass.status === 'AT_GATE';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.title}>
                Delivery Pass — {pass.flatLabel ?? 'My Flat'}
              </Text>
              <Chip
                style={{
                  backgroundColor: isDelivered ? '#E8F5E9' : isAtGate ? '#E1F5FE' : '#FFF9C4',
                }}
                textStyle={{
                  color: isDelivered ? '#2E7D32' : isAtGate ? '#0277BD' : '#F57F17',
                  fontWeight: 'bold',
                }}
              >
                {pass.status}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Storage Location:</Text>
              <Text style={styles.value}>{pass.storageLocation}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Delivery Type:</Text>
              <Text style={styles.value}>
                {pass.deliveryType === 'SOCIETY_GATE' ? 'Gate Pickup' : 'Door-to-Door'}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>
              Package Items Checklist:
            </Text>
            {pass.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemBullet}>✓</Text>
                <Text style={styles.itemName}>
                  {item.productName} — {item.quantity} {item.unit}s
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {isDelivered && (
          <Card style={[styles.card, { backgroundColor: '#F1F8E9' }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                ✓ Delivery Successfully Verified
              </Text>
              <Text style={[styles.subtext, { marginTop: 6 }]}>
                Verified via {pass.verificationMethod ?? 'QR scan'} on{' '}
                {pass.deliveredAt ? new Date(pass.deliveredAt).toLocaleString() : 'today'}.
              </Text>
              <Text style={[styles.subtext, { marginTop: 6 }]}>
                You have 24 hours to report any item quality or quantity issues before escrow is
                settled.
              </Text>
            </Card.Content>
          </Card>
        )}

        {!isDelivered && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Gate Pickup Verification
              </Text>
              <Text style={styles.subtext}>
                Visit the society gate and scan the QR pass on the watchman's device, or show this
                pass for scan verification.
              </Text>

              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Secure Single-Use QR Token:</Text>
                <Text style={styles.tokenText} numberOfLines={2}>
                  {pass.qrToken}
                </Text>
              </View>

              <Button
                mode="contained"
                style={styles.verifyBtn}
                loading={verifyMutation.isPending}
                onPress={() => verifyMutation.mutate(pass.qrToken)}
              >
                Simulate QR Scan Verification
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', flex: 1 },
  divider: { marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#666666' },
  value: { fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  itemBullet: { color: '#2E7D32', fontWeight: 'bold', marginRight: 8 },
  itemName: { fontSize: 14, fontWeight: '500' },
  subtext: { color: '#555555', fontSize: 13, lineHeight: 18 },
  tokenBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 6,
    marginVertical: 12,
  },
  tokenLabel: { fontSize: 11, color: '#757575', marginBottom: 4 },
  tokenText: { fontSize: 11, fontFamily: 'monospace', color: '#333333' },
  verifyBtn: { backgroundColor: '#1565C0', marginTop: 4 },
});
