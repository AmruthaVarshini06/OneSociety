import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  TextInput,
  HelperText,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRentalItem } from '../../../src/services/rentals';
import {
  previewBookingCharge,
  createBooking,
  type BillingUnit,
} from '../../../src/services/rental-bookings';

export default function BookItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [billingUnit, setBillingUnit] = useState<BillingUnit>('HOUR');
  const [bookedUnits, setBookedUnits] = useState('4');
  const [startAt, setStartAt] = useState('');
  const [preview, setPreview] = useState<{
    calc: { rate: number; units: number; chargePaise: number; depositPaise: number; totalPaise: number };
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ['rental-item', id],
    queryFn: () => getRentalItem(id!),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      createBooking({
        itemId: id!,
        billingUnit,
        bookedUnits: parseInt(bookedUnits, 10),
        startAt: new Date(startAt.trim()).toISOString(),
      }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert(
        'Request Sent!',
        'Your booking request has been sent to the owner. They have 12 hours to respond.',
        [
          {
            text: 'View Booking',
            onPress: () => router.replace(`/(app)/rentals/bookings/${booking._id}` as never),
          },
        ],
      );
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send booking request');
    },
  });

  const handlePreview = async () => {
    const units = parseInt(bookedUnits, 10);
    if (!units || units < 1) {
      Alert.alert('Required', 'Enter a valid duration (at least 1).');
      return;
    }
    try {
      setIsPreviewing(true);
      const result = await previewBookingCharge(id!, billingUnit, units);
      setPreview(result);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleBook = () => {
    const units = parseInt(bookedUnits, 10);
    if (!units || units < 1) {
      Alert.alert('Required', 'Enter a valid duration.');
      return;
    }
    if (!startAt.trim()) {
      Alert.alert('Required', 'Please enter the start date and time.');
      return;
    }
    const date = new Date(startAt.trim());
    if (isNaN(date.getTime()) || date < new Date()) {
      Alert.alert('Invalid Date', 'Please enter a future date and time (YYYY-MM-DDTHH:MM).');
      return;
    }
    if (!preview) {
      Alert.alert('Preview First', 'Please preview the charge calculation before booking.');
      return;
    }

    Alert.alert(
      'Confirm Booking Request',
      `Send a booking request for ${units} ${billingUnit.toLowerCase()}${units > 1 ? 's' : ''}?\n\nCharge: ₹${(preview.calc.chargePaise / 100).toFixed(0)}\nDeposit: ₹${(preview.calc.depositPaise / 100).toFixed(0)}\nTotal to pay: ₹${(preview.calc.totalPaise / 100).toFixed(0)} (held in escrow after owner accepts)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', onPress: () => bookMutation.mutate() },
      ],
    );
  };

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasHourly = !!item.chargeHourlyPaise;
  const hasDaily = !!item.chargeDailyPaise;

  const unitButtons = [
    ...(hasHourly ? [{ value: 'HOUR', label: 'Per Hour' }] : []),
    ...(hasDaily ? [{ value: 'DAY', label: 'Per Day' }] : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.itemTitle}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.itemSub}>
              {item.category.toUpperCase()} · Pickup: {item.pickupLocation}
            </Text>

            <Divider style={{ marginVertical: 10 }} />

            <View style={styles.ratesRow}>
              {item.chargeHourlyPaise ? (
                <View style={styles.rateBox}>
                  <Text variant="headlineSmall" style={styles.rateVal}>
                    ₹{(item.chargeHourlyPaise / 100).toFixed(0)}
                  </Text>
                  <Text variant="bodySmall" style={styles.rateUnit}>/ hour</Text>
                </View>
              ) : null}
              {item.chargeDailyPaise ? (
                <View style={styles.rateBox}>
                  <Text variant="headlineSmall" style={styles.rateVal}>
                    ₹{(item.chargeDailyPaise / 100).toFixed(0)}
                  </Text>
                  <Text variant="bodySmall" style={styles.rateUnit}>/ day</Text>
                </View>
              ) : null}
              <View style={[styles.rateBox, { backgroundColor: '#E8F5E9' }]}>
                <Text variant="headlineSmall" style={[styles.rateVal, { color: '#2E7D32' }]}>
                  ₹{(item.safeDepositPaise / 100).toFixed(0)}
                </Text>
                <Text variant="bodySmall" style={styles.rateUnit}>refund. deposit</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Booking Details
            </Text>

            {unitButtons.length > 1 && (
              <>
                <Text variant="bodySmall" style={styles.fieldLabel}>Billing Unit:</Text>
                <SegmentedButtons
                  value={billingUnit}
                  onValueChange={(v) => {
                    setBillingUnit(v as BillingUnit);
                    setPreview(null);
                  }}
                  buttons={unitButtons}
                  style={{ marginBottom: 10 }}
                />
              </>
            )}

            <View style={styles.row}>
              <TextInput
                label={`Number of ${billingUnit === 'HOUR' ? 'Hours' : 'Days'} *`}
                value={bookedUnits}
                onChangeText={(v) => {
                  setBookedUnits(v);
                  setPreview(null);
                }}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />
              <TextInput
                label="Start Date & Time *"
                value={startAt}
                onChangeText={setStartAt}
                placeholder="2026-11-25T10:00"
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>
            <HelperText type="info">Format: YYYY-MM-DDTHH:MM (24h)</HelperText>

            <Button
              mode="outlined"
              icon="calculator"
              loading={isPreviewing}
              disabled={isPreviewing}
              onPress={handlePreview}
              style={{ marginTop: 8 }}
            >
              Calculate Charge
            </Button>

            {}
            {preview && (
              <View style={styles.previewBox}>
                <Text variant="titleSmall" style={styles.previewTitle}>
                  Charge Breakdown
                </Text>
                <Divider style={{ marginVertical: 6 }} />
                <View style={styles.previewRow}>
                  <Text variant="bodyMedium">
                    ₹{(preview.calc.rate / 100).toFixed(0)} × {preview.calc.units}{' '}
                    {billingUnit === 'HOUR' ? 'hr' : 'day'}{preview.calc.units > 1 ? 's' : ''}
                  </Text>
                  <Text variant="bodyMedium" style={styles.previewAmt}>
                    ₹{(preview.calc.chargePaise / 100).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text variant="bodyMedium" style={{ color: '#2E7D32' }}>
                    + Refundable Safe Deposit
                  </Text>
                  <Text variant="bodyMedium" style={[styles.previewAmt, { color: '#2E7D32' }]}>
                    ₹{(preview.calc.depositPaise / 100).toFixed(0)}
                  </Text>
                </View>
                <Divider style={{ marginVertical: 6 }} />
                <View style={styles.previewRow}>
                  <Text variant="titleSmall" style={{ fontWeight: '800' }}>
                    Total (held in escrow)
                  </Text>
                  <Text variant="titleSmall" style={[styles.previewAmt, { fontWeight: '800', color: '#1565C0' }]}>
                    ₹{(preview.calc.totalPaise / 100).toFixed(0)}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.escrowNote}>
                  The full amount is held safely in escrow until the item is returned and verified.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {}
        <Card style={styles.infoCard} mode="outlined">
          <Card.Content style={{ gap: 6 }}>
            <View style={styles.infoRow}>
              <Chip icon="shield-lock" compact style={styles.infoChip}>Escrow Protected</Chip>
              <Text variant="bodySmall" style={styles.infoText}>
                Payment is held safely — released to owner only after you confirm return.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Chip icon="camera" compact style={styles.infoChip}>Photo Proof</Chip>
              <Text variant="bodySmall" style={styles.infoText}>
                You take photos at pickup; owner takes photos at return. Disputes resolved fairly.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Chip icon="cash-refund" compact style={styles.infoChip}>Auto Refund</Chip>
              <Text variant="bodySmall" style={styles.infoText}>
                Early returns are refunded pro-rata. Full deposit returned on clean handover.
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="calendar-check"
          loading={bookMutation.isPending}
          disabled={bookMutation.isPending || !preview}
          onPress={handleBook}
          style={styles.bookBtn}
          contentStyle={{ height: 50 }}
        >
          Send Booking Request
        </Button>
        {!preview && (
          <Text variant="bodySmall" style={styles.calcFirst}>
            Preview the charge calculation first to enable booking.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardContent: { gap: 8 },
  sectionHeader: { fontWeight: '700', color: '#212121', marginBottom: 4 },
  itemTitle: { fontWeight: '800', color: '#1565C0' },
  itemSub: { color: '#757575', marginTop: 4 },
  ratesRow: { flexDirection: 'row', gap: 10 },
  rateBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  rateVal: { fontWeight: '700', color: '#1565C0' },
  rateUnit: { color: '#616161', marginTop: 2 },
  fieldLabel: { color: '#616161', fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  input: { backgroundColor: '#FFFFFF' },
  previewBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  previewTitle: { fontWeight: '700', color: '#1565C0' },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  previewAmt: { fontWeight: '700' },
  escrowNote: {
    color: '#1565C0',
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoCard: { borderRadius: 12, backgroundColor: '#F9FBE7', borderColor: '#F9A825' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoChip: { backgroundColor: '#FFF9C4' },
  infoText: { color: '#616161', flex: 1, lineHeight: 18 },
  bookBtn: { borderRadius: 10, marginTop: 4 },
  calcFirst: { textAlign: 'center', color: '#9E9E9E', marginTop: 4 },
});
