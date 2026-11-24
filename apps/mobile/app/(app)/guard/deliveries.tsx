import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Divider,
  TextInput,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listGroupOrders, type GroupOrder } from '../../../src/services/group-orders';
import {
  getDeliveryManifest,
  acceptGateManifest,
  getGatePickups,
  verifyDeliveryQr,
  requestOtpFallback,
  verifyOtpFallback,
} from '../../../src/services/delivery';

export default function GuardDeliveriesScreen() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpFlatId, setOtpFlatId] = useState('');
  const [otpFlatLabel, setOtpFlatLabel] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpReason, setOtpReason] = useState('Camera scan failed');

  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [receivedPackages, setReceivedPackages] = useState('10');

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['group-orders-deliveries'],
    queryFn: () => listGroupOrders({ limit: 50 }),
  });

  const activeOrders = (ordersData?.orders ?? []).filter((o) =>
    ['DISPATCHED', 'DELIVERING', 'DELIVERED', 'COMPLETED'].includes(o.status),
  );

  const activeOrderId = selectedOrderId ?? activeOrders[0]?._id;

  const { data: manifestData, isLoading: isManifestLoading } = useQuery({
    queryKey: ['delivery-manifest', activeOrderId],
    queryFn: () => getDeliveryManifest(activeOrderId!),
    enabled: !!activeOrderId,
  });

  const { data: pickupsData, isLoading: isPickupsLoading, refetch: refetchPickups } = useQuery({
    queryKey: ['gate-pickups', activeOrderId],
    queryFn: () => getGatePickups(activeOrderId!),
    enabled: !!activeOrderId,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      acceptGateManifest(activeOrderId!, {
        packagesReceived: parseInt(receivedPackages, 10) || 1,
      }),
    onSuccess: () => {
      setAcceptModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['delivery-manifest', activeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['gate-pickups', activeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['group-orders-deliveries'] });
      Alert.alert('Manifest Accepted', 'Packages marked as received at gate.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to accept manifest');
    },
  });

  const verifyQrMutation = useMutation({
    mutationFn: (qrToken: string) => verifyDeliveryQr(activeOrderId!, qrToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-pickups', activeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-manifest', activeOrderId] });
      Alert.alert('Delivery Verified', 'Resident pickup marked SUCCESSFUL.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'QR verification failed');
    },
  });

  const requestOtpMutation = useMutation({
    mutationFn: (flatId: string) => requestOtpFallback(activeOrderId!, flatId),
    onSuccess: (res) => {
      setOtpCode(res.demoOtp);
      Alert.alert('OTP Sent', `Verification OTP for resident: ${res.demoOtp}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to request OTP');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      verifyOtpFallback(activeOrderId!, {
        flatId: otpFlatId,
        otp: otpCode,
        overrideReason: otpReason,
      }),
    onSuccess: () => {
      setOtpModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['gate-pickups', activeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-manifest', activeOrderId] });
      Alert.alert('Success', 'Delivery verified via OTP override.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'OTP verification failed');
    },
  });

  if (isOrdersLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading deliveries...</Text>
      </SafeAreaView>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text variant="titleMedium" style={styles.title}>
          No Active Gate Deliveries
        </Text>
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 8 }]}>
          There are no dispatched group buying deliveries at the society gate right now.
        </Text>
      </SafeAreaView>
    );
  }

  const manifest = manifestData?.manifest;
  const pickups = pickupsData?.pickups ?? [];
  const selectedOrder = activeOrders.find((o) => o._id === activeOrderId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Active Orders:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {activeOrders.map((o) => (
            <Chip
              key={o._id}
              selected={o._id === activeOrderId}
              onPress={() => setSelectedOrderId(o._id)}
              style={[styles.orderChip, o._id === activeOrderId && styles.orderChipSelected]}
            >
              {o.productName} ({o.status})
            </Chip>
          ))}
        </ScrollView>

        {}
        {manifest && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={styles.title}>
                  Gate Manifest: {selectedOrder?.productName}
                </Text>
                <Chip
                  style={{
                    backgroundColor:
                      manifest.status === 'ACCEPTED_AT_GATE' ? '#E8F5E9' : '#FFF9C4',
                  }}
                  textStyle={{
                    color: manifest.status === 'ACCEPTED_AT_GATE' ? '#2E7D32' : '#F57F17',
                    fontWeight: 'bold',
                  }}
                >
                  {manifest.status}
                </Chip>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Storage Location:</Text>
                <Text style={styles.value}>{manifest.storageLocation}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Packages Declared:</Text>
                <Text style={styles.value}>{manifest.totalPackagesDeclared}</Text>
              </View>
              {manifest.totalPackagesReceived !== undefined && (
                <View style={styles.row}>
                  <Text style={styles.label}>Packages Received:</Text>
                  <Text style={[styles.value, { color: '#2E7D32' }]}>
                    {manifest.totalPackagesReceived}
                  </Text>
                </View>
              )}

              {manifest.status === 'DISPATCHED' && (
                <Button
                  mode="contained"
                  style={styles.acceptBtn}
                  onPress={() => {
                    setReceivedPackages(String(manifest.totalPackagesDeclared));
                    setAcceptModalVisible(true);
                  }}
                >
                  Accept Manifest at Gate
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Resident Pickups ({pickups.length})
        </Text>

        {isPickupsLoading ? (
          <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
        ) : pickups.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.subtext, { textAlign: 'center' }]}>
                No flat delivery passes generated yet.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          pickups.map((p) => {
            const isDelivered = p.status === 'DELIVERED';
            return (
              <Card key={p._id} style={styles.pickupCard}>
                <Card.Content>
                  <View style={styles.headerRow}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Flat {p.flatLabel}
                    </Text>
                    <Chip
                      style={{
                        backgroundColor: isDelivered ? '#E8F5E9' : '#FFF9C4',
                        height: 28,
                      }}
                      textStyle={{
                        fontSize: 11,
                        color: isDelivered ? '#2E7D32' : '#F57F17',
                        fontWeight: 'bold',
                      }}
                    >
                      {p.status}
                    </Chip>
                  </View>

                  <Text style={styles.subtext}>Resident: {p.residentName}</Text>
                  {p.items?.map((it, idx) => (
                    <Text key={idx} style={[styles.subtext, { marginTop: 2 }]}>
                      • {it.productName}: {it.quantity} {it.unit}s
                    </Text>
                  ))}

                  {!isDelivered && (
                    <View style={styles.actionRow}>
                      <Button
                        mode="contained"
                        style={styles.verifyBtn}
                        loading={verifyQrMutation.isPending}
                        onPress={() => verifyQrMutation.mutate(p.qrToken)}
                      >
                        Verify QR
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setOtpFlatId(p.flatId);
                          setOtpFlatLabel(p.flatLabel);
                          setOtpModalVisible(true);
                          requestOtpMutation.mutate(p.flatId);
                        }}
                      >
                        OTP Fallback
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {}
      <Portal>
        <Modal
          visible={acceptModalVisible}
          onDismiss={() => setAcceptModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Accept Consignment at Gate
          </Text>
          <Text style={[styles.subtext, { marginBottom: 16 }]}>
            Verify the package count handed over by the supplier delivery driver:
          </Text>
          <TextInput
            label="Packages Count Received"
            value={receivedPackages}
            onChangeText={setReceivedPackages}
            keyboardType="number-pad"
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setAcceptModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={acceptMutation.isPending}
              onPress={() => acceptMutation.mutate()}
            >
              Confirm Received
            </Button>
          </View>
        </Modal>
      </Portal>

      {}
      <Portal>
        <Modal
          visible={otpModalVisible}
          onDismiss={() => setOtpModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            OTP Override for Flat {otpFlatLabel}
          </Text>
          <TextInput
            label="6-Digit OTP"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            mode="outlined"
            style={{ marginBottom: 12 }}
          />
          <TextInput
            label="Override Reason"
            value={otpReason}
            onChangeText={setOtpReason}
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setOtpModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={verifyOtpMutation.isPending}
              onPress={() => verifyOtpMutation.mutate()}
            >
              Confirm Pickup
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  pickupCard: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', flex: 1 },
  divider: { marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#666666' },
  value: { fontWeight: '600' },
  sectionLabel: { fontWeight: 'bold', marginBottom: 8, color: '#424242' },
  sectionHeader: { fontWeight: 'bold', marginVertical: 12, color: '#424242' },
  chipsScroll: { marginBottom: 12 },
  orderChip: { marginRight: 8, backgroundColor: '#E0E0E0' },
  orderChipSelected: { backgroundColor: '#BBDEFB' },
  subtext: { color: '#666666', fontSize: 13 },
  acceptBtn: { marginTop: 12, backgroundColor: '#1565C0' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  verifyBtn: { backgroundColor: '#2E7D32' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
});
