import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  RadioButton,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupOrder } from '../../../src/services/group-orders';
import { dispatchOrder } from '../../../src/services/delivery';

export default function DispatchOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const tomorrowStr = new Date(Date.now() + 86400_000).toISOString();
  const [deliveryDate, setDeliveryDate] = useState(tomorrowStr);
  const [deliveryType, setDeliveryType] = useState<'SOCIETY_GATE' | 'DOOR_TO_DOOR'>('SOCIETY_GATE');
  const [storageLocation, setStorageLocation] = useState('Society Gate Storage');
  const [packagesDeclared, setPackagesDeclared] = useState('10');

  const { data: orderData, isLoading, isError } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const order = orderData?.order;

  const dispatchMutation = useMutation({
    mutationFn: () =>
      dispatchOrder(id, {
        promisedDeliveryDate: deliveryDate,
        deliveryType,
        storageLocation,
        totalPackagesDeclared: parseInt(packagesDeclared, 10) || 1,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-order', id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-manifest', id] });
      Alert.alert(
        'Order Dispatched!',
        `Manifest created and ${data.passesCreated} flat delivery passes generated.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to dispatch order';
      Alert.alert('Dispatch Error', msg);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Failed to load order details.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.title}>
              Dispatch: {order.productName}
            </Text>
            <Text style={styles.subtext}>
              Confirm delivery details to generate the society gate manifest and resident passes.
            </Text>

            <Divider style={styles.divider} />

            <TextInput
              label="Promised Delivery Date (ISO)"
              value={deliveryDate}
              onChangeText={setDeliveryDate}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.sectionLabel}>
              Delivery Type
            </Text>
            <RadioButton.Group
              onValueChange={(val) => setDeliveryType(val as any)}
              value={deliveryType}
            >
              <View style={styles.radioRow}>
                <RadioButton value="SOCIETY_GATE" />
                <Text>Society Gate Handover</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="DOOR_TO_DOOR" />
                <Text>Door-to-Door Delivery</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              label="Storage Location at Gate"
              value={storageLocation}
              onChangeText={setStorageLocation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Society Gate Storage / Rack B"
            />

            <TextInput
              label="Total Packages Declared"
              value={packagesDeclared}
              onChangeText={setPackagesDeclared}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
            />

            <Button
              mode="contained"
              style={styles.dispatchBtn}
              loading={dispatchMutation.isPending}
              disabled={dispatchMutation.isPending}
              onPress={() => dispatchMutation.mutate()}
            >
              Confirm Dispatch & Generate Manifest
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF' },
  title: { fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  sectionLabel: { marginTop: 8, marginBottom: 4, fontWeight: 'bold' },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  input: { marginBottom: 12 },
  subtext: { color: '#666666', fontSize: 13, marginTop: 4 },
  errorText: { color: '#C62828', fontSize: 16 },
  dispatchBtn: { marginTop: 16, backgroundColor: '#2E7D32', paddingVertical: 4 },
});
