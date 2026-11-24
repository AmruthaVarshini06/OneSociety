import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  TextInput,
  RadioButton,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupOrder } from '../../../src/services/group-orders';
import { getMyDeliveryPass } from '../../../src/services/delivery';
import { reportIssue, listIssues, escalateIssue } from '../../../src/services/disputes';

export default function ReportIssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [issueType, setIssueType] = useState<'QUALITY' | 'QUANTITY_SHORT' | 'MISSING_ITEM'>(
    'QUALITY',
  );
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const { data: passData, isLoading: isPassLoading } = useQuery({
    queryKey: ['my-delivery-pass', id],
    queryFn: () => getMyDeliveryPass(id),
    enabled: !!id,
  });

  const { data: issuesData, isLoading: isIssuesLoading } = useQuery({
    queryKey: ['order-issues', id],
    queryFn: () => listIssues(id),
    enabled: !!id,
  });

  const order = orderData?.order;
  const pass = passData?.pass;
  const issues = issuesData?.issues ?? [];

  const reportMutation = useMutation({
    mutationFn: () =>
      reportIssue(id, {
        productName: order?.productName ?? 'Item',
        quantity: parseInt(quantity, 10) || 1,
        issueType,
        description,
      }),
    onSuccess: () => {
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['order-issues', id] });
      Alert.alert('Issue Reported', 'Your dispute was submitted. The supplier has been notified.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to report issue');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (issueId: string) => escalateIssue(id, issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-issues', id] });
      Alert.alert('Escalated', 'Dispute escalated to society President for resolution.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to escalate issue');
    },
  });

  if (isOrderLoading || isPassLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading issue details...</Text>
      </SafeAreaView>
    );
  }

  if (!order || !pass || pass.status !== 'DELIVERED') {
    return (
      <SafeAreaView style={styles.center}>
        <Text variant="titleMedium" style={styles.title}>
          Delivery Not Confirmed
        </Text>
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: 8 }]}>
          Issues can only be reported after package pickup is confirmed.
        </Text>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 24 }}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const deliveredAt = pass.deliveredAt ? new Date(pass.deliveredAt).getTime() : Date.now();
  const windowEnd = deliveredAt + 24 * 3600_000;
  const msRemaining = Math.max(0, windowEnd - Date.now());
  const hoursLeft = Math.floor(msRemaining / 3600_000);
  const minsLeft = Math.floor((msRemaining % 3600_000) / 60_000);
  const isWindowClosed = msRemaining <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <Card style={[styles.card, { backgroundColor: isWindowClosed ? '#FFEBEE' : '#FFF9C4' }]}>
          <Card.Content>
            <Text
              variant="titleSmall"
              style={{ fontWeight: 'bold', color: isWindowClosed ? '#C62828' : '#F57F17' }}
            >
              {isWindowClosed
                ? '24-Hour Issue Window Closed'
                : `24-Hour Dispute Window: ${hoursLeft}h ${minsLeft}m left`}
            </Text>
            <Text style={[styles.subtext, { marginTop: 4 }]}>
              {isWindowClosed
                ? 'The 24-hour window to report issues has expired. Delivery is finalized.'
                : 'Report any damaged items, quantity discrepancies, or quality issues before escrow is released.'}
            </Text>
          </Card.Content>
        </Card>

        {}
        {!isWindowClosed && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.title}>
                Report an Issue: {order.productName}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="labelLarge" style={styles.fieldLabel}>
                Issue Type
              </Text>
              <RadioButton.Group
                onValueChange={(val) => setIssueType(val as any)}
                value={issueType}
              >
                <View style={styles.radioRow}>
                  <RadioButton value="QUALITY" />
                  <Text>Quality Issue / Damaged</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="QUANTITY_SHORT" />
                  <Text>Quantity Short / Less Delivered</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="MISSING_ITEM" />
                  <Text>Missing Item Entirely</Text>
                </View>
              </RadioButton.Group>

              <TextInput
                label={`Quantity Affected (${order.unit})`}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Detailed Description"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Describe the issue clearly for the supplier..."
              />

              <Button
                mode="contained"
                style={styles.submitBtn}
                loading={reportMutation.isPending}
                disabled={reportMutation.isPending || description.length < 10}
                onPress={() => reportMutation.mutate()}
              >
                Submit Issue to Supplier
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Reported Issues ({issues.length})
        </Text>

        {issues.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.subtext, { textAlign: 'center' }]}>
                No issues reported for your flat.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          issues.map((iss) => {
            const isResolved =
              iss.status === 'RESOLVED_REFUND' || iss.status === 'RESOLVED_REPLACEMENT';
            return (
              <Card key={iss._id} style={styles.issueCard}>
                <Card.Content>
                  <View style={styles.headerRow}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      {iss.issueType.replace('_', ' ')}: {iss.item.quantity} {order.unit}(s)
                    </Text>
                    <Chip
                      style={{
                        backgroundColor: isResolved
                          ? '#E8F5E9'
                          : iss.status === 'ESCALATED'
                          ? '#EDE7F6'
                          : '#FFF9C4',
                        height: 28,
                      }}
                      textStyle={{
                        fontSize: 11,
                        color: isResolved
                          ? '#2E7D32'
                          : iss.status === 'ESCALATED'
                          ? '#512DA8'
                          : '#F57F17',
                        fontWeight: 'bold',
                      }}
                    >
                      {iss.status}
                    </Chip>
                  </View>

                  <Text style={[styles.subtext, { marginTop: 6 }]}>"{iss.description}"</Text>

                  {iss.supplierResponse && (
                    <View style={styles.responseBox}>
                      <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                        Supplier Action: {iss.supplierResponse.action}
                      </Text>
                      {iss.supplierResponse.note && (
                        <Text style={styles.subtext}>Note: {iss.supplierResponse.note}</Text>
                      )}
                    </View>
                  )}

                  {iss.presidentResolution && (
                    <View style={[styles.responseBox, { backgroundColor: '#EDE7F6' }]}>
                      <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#512DA8' }}>
                        President Ruling: {iss.presidentResolution.decision}
                      </Text>
                      {iss.presidentResolution.note && (
                        <Text style={styles.subtext}>Note: {iss.presidentResolution.note}</Text>
                      )}
                    </View>
                  )}

                  {iss.status === 'OPEN' && (
                    <Button
                      mode="outlined"
                      textColor="#512DA8"
                      style={{ marginTop: 8 }}
                      loading={escalateMutation.isPending}
                      onPress={() => escalateMutation.mutate(iss._id)}
                    >
                      Escalate to President
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          })
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
  issueCard: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold' },
  divider: { marginVertical: 12 },
  fieldLabel: { fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  input: { marginBottom: 12 },
  subtext: { color: '#666666', fontSize: 13 },
  sectionHeader: { fontWeight: 'bold', marginVertical: 12, color: '#424242' },
  submitBtn: { backgroundColor: '#C62828', marginTop: 4 },
  responseBox: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
});
