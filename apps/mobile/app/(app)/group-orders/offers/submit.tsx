import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  HelperText,
  Card,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { submitOffer, getMyOffer } from '../../../../src/services/offers';
import type { PriceTier } from '../../../../src/services/group-orders';
import { getGroupOrder } from '../../../../src/services/group-orders';

function formatPaise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

interface TierRow {
  minQuantity: string;
  pricePerUnit: string; // in rupees for input, converted to paise on submit
}

function emptyTier(): TierRow {
  return { minQuantity: '', pricePerUnit: '' };
}

function validateTierRows(rows: TierRow[], unit: string): string[] {
  const errors: string[] = [];
  if (rows.length === 0) { errors.push('Add at least one tier'); return errors; }
  let prevMin = 0;
  let prevPrice = Infinity;
  rows.forEach((r, i) => {
    const min = parseInt(r.minQuantity, 10);
    const price = parseFloat(r.pricePerUnit);
    if (!min || min <= 0) errors.push(`Tier ${i + 1}: min quantity must be a positive integer`);
    else if (min <= prevMin) errors.push(`Tier ${i + 1}: min quantity must be greater than tier ${i}`);
    if (!price || price <= 0) errors.push(`Tier ${i + 1}: price must be positive`);
    else if (price >= prevPrice) errors.push(`Tier ${i + 1}: price must be lower than tier ${i} (bulk discount)`);
    if (min > 0) prevMin = min;
    if (price > 0) prevPrice = price;
  });
  return errors;
}

export default function SubmitOfferScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const [tiers, setTiers] = useState<TierRow[]>([emptyTier()]);
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [note, setNote] = useState('');
  const [tierErrors, setTierErrors] = useState<string[]>([]);
  const [deliveryError, setDeliveryError] = useState('');

  // Load order for unit label
  const { data: orderData } = useQuery({
    queryKey: ['group-order', orderId],
    queryFn: () => getGroupOrder(orderId),
    enabled: !!orderId,
  });

  // Pre-fill if offer already exists
  const { data: myOfferData, isLoading: loadingMyOffer } = useQuery({
    queryKey: ['my-offer', orderId],
    queryFn: () => getMyOffer(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (myOfferData?.offer) {
      const o = myOfferData.offer;
      setTiers(o.tiers.map((t) => ({
        minQuantity: String(t.minQuantity),
        pricePerUnit: (t.pricePerUnit / 100).toFixed(2),
      })));
      setDeliveryDays(String(o.deliveryDays));
      setNote(o.note ?? '');
    }
  }, [myOfferData]);

  const mutation = useMutation({
    mutationFn: () => {
      const tierPayload: PriceTier[] = tiers.map((t) => ({
        minQuantity: parseInt(t.minQuantity, 10),
        pricePerUnit: Math.round(parseFloat(t.pricePerUnit) * 100), // rupees → paise
      }));
      return submitOffer(orderId, {
        tiers: tierPayload,
        deliveryDays: parseInt(deliveryDays, 10),
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-offer', orderId] });
      Alert.alert('Done', 'Your offer has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit offer.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    const errs = validateTierRows(tiers, orderData?.order.unit ?? 'unit');
    const days = parseInt(deliveryDays, 10);
    let dErr = '';
    if (!days || days < 1) dErr = 'At least 1 day';
    else if (days > 60) dErr = 'Maximum 60 days';
    setTierErrors(errs);
    setDeliveryError(dErr);
    if (errs.length > 0 || dErr) return;
    mutation.mutate();
  };

  const addTier = () => setTiers((p) => [...p, emptyTier()]);
  const removeTier = (i: number) => setTiers((p) => p.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TierRow, val: string) =>
    setTiers((p) => p.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));

  const unit = orderData?.order.unit ?? 'unit';
  const hasExisting = !!myOfferData?.offer;

  if (loadingMyOffer) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.heading}>
          {hasExisting ? 'Update Offer' : 'Submit Offer'}
        </Text>
        {orderData?.order && (
          <Text variant="bodyMedium" style={styles.sub}>
            For: {orderData.order.productName} · Demand: {orderData.order.totalDemandedQuantity} {unit}
          </Text>
        )}

        {/* Tier builder */}
        <Text variant="titleSmall" style={styles.section}>Price Tiers</Text>
        <Text variant="bodySmall" style={styles.hint}>
          More units = lower price. Each tier applies when total demand reaches the minimum.
        </Text>
        {tiers.map((tier, i) => (
          <Card key={i} style={styles.tierCard} mode="outlined">
            <Card.Content>
              <View style={styles.tierHeader}>
                <Text variant="labelMedium" style={styles.tierLabel}>Tier {i + 1}</Text>
                {tiers.length > 1 && (
                  <IconButton icon="close" size={16} onPress={() => removeTier(i)} />
                )}
              </View>
              <View style={styles.tierRow}>
                <View style={styles.flex1}>
                  <TextInput
                    label={`Min qty (${unit})`}
                    value={tier.minQuantity}
                    onChangeText={(v) => updateTier(i, 'minQuantity', v.replace(/[^0-9]/g, ''))}
                    mode="outlined"
                    keyboardType="number-pad"
                    dense
                    style={styles.input}
                  />
                </View>
                <View style={[styles.flex1, styles.ml8]}>
                  <TextInput
                    label="Price / unit (₹)"
                    value={tier.pricePerUnit}
                    onChangeText={(v) => updateTier(i, 'pricePerUnit', v.replace(/[^0-9.]/g, ''))}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    dense
                    style={styles.input}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        {tierErrors.length > 0 && (
          <View style={styles.errorBox}>
            {tierErrors.map((e, i) => (
              <Text key={i} style={styles.errorText}>{e}</Text>
            ))}
          </View>
        )}

        <Button mode="outlined" onPress={addTier} icon="plus" style={styles.addTierBtn}>
          Add Tier
        </Button>

        {/* Delivery */}
        <Text variant="titleSmall" style={styles.section}>Delivery</Text>
        <TextInput
          label="Estimated delivery (days after confirmation)"
          value={deliveryDays}
          onChangeText={(v) => { setDeliveryDays(v.replace(/[^0-9]/g, '')); setDeliveryError(''); }}
          mode="outlined"
          keyboardType="number-pad"
          error={!!deliveryError}
          style={styles.input}
        />
        <HelperText type="error" visible={!!deliveryError}>{deliveryError}</HelperText>

        {/* Note */}
        <Text variant="titleSmall" style={styles.section}>Note (optional)</Text>
        <TextInput
          label="Additional note for the society"
          value={note}
          onChangeText={setNote}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          {hasExisting ? 'Update Offer' : 'Submit Offer'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontWeight: '700', color: '#7B1FA2', marginBottom: 2 },
  sub: { color: '#757575', marginBottom: 16 },
  section: { color: '#7B1FA2', fontWeight: '600', marginTop: 16, marginBottom: 6 },
  hint: { color: '#9E9E9E', marginBottom: 8, lineHeight: 18 },
  tierCard: { marginBottom: 8, borderRadius: 8, backgroundColor: '#fff' },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tierLabel: { color: '#7B1FA2', fontWeight: '700' },
  tierRow: { flexDirection: 'row' },
  flex1: { flex: 1 },
  ml8: { marginLeft: 8 },
  input: { backgroundColor: '#fff' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { color: '#C62828', fontSize: 13 },
  addTierBtn: { marginBottom: 4 },
  submitBtn: { marginTop: 20 },
  submitBtnContent: { paddingVertical: 6 },
});
