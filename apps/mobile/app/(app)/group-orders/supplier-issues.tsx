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
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listIssues, supplierRespondIssue, type GroupBuyIssue } from '../../../src/services/disputes';

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function SupplierIssuesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeIssue, setActiveIssue] = useState<GroupBuyIssue | null>(null);
  const [responseAction, setResponseAction] = useState<'REFUND' | 'REPLACEMENT' | 'REJECT'>('REFUND');
  const [responseNote, setResponseNote] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-issues', id],
    queryFn: () => listIssues(id),
    enabled: !!id,
  });

  const issues = data?.issues ?? [];

  const respondMutation = useMutation({
    mutationFn: () =>
      supplierRespondIssue(id, activeIssue!._id, {
        action: responseAction,
        note: responseNote,
      }),
    onSuccess: () => {
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order-issues', id] });
      Alert.alert('Response Submitted', 'Your response has been recorded.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to respond');
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading issues...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Failed to load disputes.</Text>
        <Button mode="outlined" onPress={() => refetch()} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Resident Delivery Issues ({issues.length})
        </Text>

        {issues.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={[styles.subtext, { textAlign: 'center' }]}>
                No issues reported by residents for this order.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          issues.map((iss) => {
            const isOpen = iss.status === 'OPEN' || iss.status === 'ESCALATED';
            return (
              <Card key={iss._id} style={styles.issueCard}>
                <Card.Content>
                  <View style={styles.row}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Flat {iss.flatLabel} ({iss.residentName})
                    </Text>
                    <Chip
                      style={{
                        backgroundColor:
                          iss.status === 'RESOLVED_REFUND'
                            ? '#E8F5E9'
                            : iss.status === 'ESCALATED'
                            ? '#EDE7F6'
                            : '#FFF9C4',
                        height: 28,
                      }}
                      textStyle={{ fontSize: 11, fontWeight: 'bold' }}
                    >
                      {iss.status}
                    </Chip>
                  </View>

                  <Text style={[styles.subtext, { marginTop: 4 }]}>
                    Type: <Text style={{ fontWeight: 'bold' }}>{iss.issueType.replace('_', ' ')}</Text>
                  </Text>
                  <Text style={styles.subtext}>
                    Quantity: {iss.item.quantity} | Potential Refund: {formatPaise(iss.refundAmountPaise)}
                  </Text>
                  <Text style={[styles.subtext, { marginTop: 4, fontStyle: 'italic' }]}>
                    "{iss.description}"
                  </Text>

                  {iss.supplierResponse && (
                    <View style={styles.responseBox}>
                      <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                        Your Response: {iss.supplierResponse.action}
                      </Text>
                      {iss.supplierResponse.note && (
                        <Text style={styles.subtext}>Note: {iss.supplierResponse.note}</Text>
                      )}
                    </View>
                  )}

                  {isOpen && (
                    <View style={styles.actionsRow}>
                      <Button
                        mode="contained"
                        style={styles.refundBtn}
                        onPress={() => {
                          setActiveIssue(iss);
                          setResponseAction('REFUND');
                          setResponseNote(`Refund approved for ${iss.item.quantity} item(s)`);
                          setModalVisible(true);
                        }}
                      >
                        Approve Refund
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setActiveIssue(iss);
                          setResponseAction('REPLACEMENT');
                          setResponseNote('Will provide replacement within 2 days');
                          setModalVisible(true);
                        }}
                      >
                        Offer Replacement
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Response Confirmation Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Respond to Issue: Flat {activeIssue?.flatLabel}
          </Text>
          <Text style={[styles.subtext, { marginBottom: 12 }]}>
            Action:{' '}
            <Text style={{ fontWeight: 'bold', color: responseAction === 'REFUND' ? '#2E7D32' : '#1565C0' }}>
              {responseAction}
            </Text>
            {responseAction === 'REFUND' &&
              ` (${formatPaise(activeIssue?.refundAmountPaise ?? 0)} will be returned from escrow)`}
          </Text>
          <TextInput
            label="Resolution Note / Message to Resident"
            value={responseNote}
            onChangeText={setResponseNote}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={respondMutation.isPending}
              onPress={() => respondMutation.mutate()}
            >
              Confirm
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
  headerTitle: { fontWeight: 'bold', marginBottom: 12, color: '#333333' },
  card: { backgroundColor: '#FFFFFF', marginBottom: 16 },
  issueCard: { backgroundColor: '#FFFFFF', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtext: { color: '#666666', fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  refundBtn: { backgroundColor: '#2E7D32' },
  responseBox: { backgroundColor: '#F5F5F5', padding: 8, borderRadius: 6, marginTop: 8 },
  errorText: { color: '#C62828', fontSize: 16 },
  modalContent: { backgroundColor: '#FFFFFF', padding: 24, margin: 20, borderRadius: 8 },
});
