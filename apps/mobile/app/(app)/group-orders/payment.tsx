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
import { getGroupOrder } from '../../../src/services/group-orders';
import {
  getMyCommitment,
  initiatePayment,
  confirmPayment,
} from '../../../src/services/commitments';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function GroupOrderPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const {
    data: commitmentData,
    isLoading: isCommitmentLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-commitment', id],
    queryFn: () => getMyCommitment(id),
    enabled: !!id,
  });

  const order = orderData?.order;
  const commitment = commitmentData?.commitment;

  // Pay mutation (demo simulates Razorpay test checkout & confirm)
  const payMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      // 1. Initiate Razorpay order on server
      const initResult = await initiatePayment(id);

      // 2. In production, open Razorpay Checkout SDK here:
      // RazorpayCheckout.open({ key: initResult.keyId, order_id: initResult.razorpayOrderId, ... })
      // For demo, submit mock payment ID and valid mock signature:
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSignature = `MOCK_SIG_${initResult.razorpayOrderId}`;

      // 3. Confirm payment with server (which verifies signature & creates escrow HOLD)
      return confirmPayment(id, {
        razorpayOrderId: initResult.razorpayOrderId,
        razorpayPaymentId: mockPaymentId,
        signature: mockSignature,
      });
    },
    onSuccess: () => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['my-commitment', id] });
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      Alert.alert('Payment Successful!', 'Your payment is now safely held in society escrow.');
    },
    onError: (err: any) => {
      setIsProcessing(false);
      const msg = err.response?.data?.message ?? err.message ?? 'Payment failed';
      Alert.alert('Payment Error', msg);
    },
  });

  if (isOrderLoading || isCommitmentLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Failed to load order details.</Text>
        <Button mode="outlined" onPress={() => refetch()} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  if (!commitment) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>No Commitment Found</Text>
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 8 }]}>
          You do not have a registered commitment for this group order.
        </Text>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 24 }}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const isPaid = commitment.status === 'PAID';
  const isPending = commitment.status === 'PENDING';
  const isCancelled = commitment.status === 'CANCELLED';
  const isRefunded = commitment.status === 'REFUNDED';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.title}>
                {order.productName}
              </Text>
              <Chip
                style={{
                  backgroundColor: isPaid
                    ? '#E8F5E9'
                    : isPending
                    ? '#FFF9C4'
                    : isRefunded
                    ? '#E1F5FE'
                    : '#FFEBEE',
                }}
                textStyle={{
                  color: isPaid
                    ? '#2E7D32'
                    : isPending
                    ? '#F57F17'
                    : isRefunded
                    ? '#0277BD'
                    : '#C62828',
                  fontWeight: 'bold',
                }}
              >
                {commitment.status}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Quantity Ordered:</Text>
              <Text style={styles.value}>
                {commitment.quantityWanted} {order.unit}s
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Locked Unit Price:</Text>
              <Text style={styles.value}>{formatPaise(commitment.pricePerUnit)}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total Payable:
              </Text>
              <Text variant="titleLarge" style={styles.totalAmount}>
                {formatPaise(commitment.totalAmountPaise)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {isPaid && (
          <Card style={[styles.card, { backgroundColor: '#F1F8E9' }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                ✓ Payment Received & Held in Escrow
              </Text>
              <Text style={[styles.subtext, { marginTop: 6 }]}>
                Your payment of {formatPaise(commitment.totalAmountPaise)} is securely held in
                the society escrow ledger. It will only be released to the supplier after your
                delivery is confirmed.
              </Text>
              {commitment.paidAt && (
                <Text style={[styles.subtext, { marginTop: 6 }]}>
                  Paid on: {new Date(commitment.paidAt).toLocaleString()}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {isRefunded && (
          <Card style={[styles.card, { backgroundColor: '#E1F5FE' }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#0277BD', fontWeight: 'bold' }}>
                Refund Issued
              </Text>
              <Text style={[styles.subtext, { marginTop: 6 }]}>
                The group order did not meet the required minimum quantity. Your payment has been
                fully refunded to your escrow account.
              </Text>
            </Card.Content>
          </Card>
        )}

        {isCancelled && (
          <Card style={[styles.card, { backgroundColor: '#FFEBEE' }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#C62828', fontWeight: 'bold' }}>
                Commitment Cancelled
              </Text>
              <Text style={[styles.subtext, { marginTop: 6 }]}>
                Payment window closed before payment was completed.
              </Text>
            </Card.Content>
          </Card>
        )}

        {isPending && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Escrow Payment Protection
              </Text>
              <Text style={styles.subtext}>
                Payment is protected by OneSociety Escrow. Funds are never transferred to the
                supplier until you scan and verify delivery.
              </Text>

              <Button
                mode="contained"
                style={styles.payButton}
                loading={isProcessing || payMutation.isPending}
                disabled={isProcessing || payMutation.isPending}
                onPress={() => payMutation.mutate()}
              >
                Pay {formatPaise(commitment.totalAmountPaise)} via Razorpay
              </Button>

              <Text style={[styles.subtext, { textAlign: 'center', marginTop: 8, fontSize: 11 }]}>
                (Test mode: Payment will simulate instant approval & escrow hold)
              </Text>
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
  totalLabel: { fontWeight: 'bold' },
  totalAmount: { color: '#1B5E20', fontWeight: 'bold' },
  subtext: { color: '#555555', fontSize: 13, lineHeight: 18 },
  errorText: { color: '#C62828', fontSize: 16 },
  payButton: { marginTop: 16, backgroundColor: '#1565C0', paddingVertical: 4 },
});
