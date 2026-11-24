import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  Divider,
  Chip,
  Modal,
  Portal,
  Card,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { getSupplier, verifySupplier } from '../../../src/services/suppliers';

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: '#FF9800',
  GST_VERIFIED: '#2196F3',
  APPROVED: '#4CAF50',
  REJECTED: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  GST_VERIFIED: 'GST Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      action,
      note,
    }: {
      action: 'approve' | 'reject';
      note?: string;
    }) => verifySupplier(id, action, note),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setRejectModalVisible(false);
      setRejectNote('');
      Alert.alert(
        'Done',
        result.message,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Action failed. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleApprove = () => {
    Alert.alert(
      'Approve Supplier',
      `Approve "${data?.supplier.businessName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => verifyMutation.mutate({ action: 'approve' }),
        },
      ],
    );
  };

  const handleRejectSubmit = () => {
    if (!rejectNote.trim()) {
      setNoteError('A rejection note is required');
      return;
    }
    setNoteError('');
    verifyMutation.mutate({ action: 'reject', note: rejectNote.trim() });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading supplier…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load supplier.</Text>
        <Button onPress={() => refetch()} style={{ marginTop: 12 }}>
          Retry
        </Button>
      </View>
    );
  }

  const { supplier } = data;
  const statusColor = STATUS_COLORS[supplier.verificationStatus] ?? '#9E9E9E';
  const statusLabel = STATUS_LABELS[supplier.verificationStatus] ?? supplier.verificationStatus;
  const canApprove =
    supplier.verificationStatus === 'PENDING_REVIEW' ||
    supplier.verificationStatus === 'GST_VERIFIED' ||
    supplier.verificationStatus === 'REJECTED';
  const canReject =
    supplier.verificationStatus === 'PENDING_REVIEW' ||
    supplier.verificationStatus === 'GST_VERIFIED';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status badge */}
        <View style={styles.statusRow}>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusColor }]}
            textStyle={styles.statusChipText}
          >
            {statusLabel}
          </Chip>
        </View>

        {/* Business info */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Business Details
            </Text>
            <Divider style={styles.divider} />
            <Row label="Business Name" value={supplier.businessName} />
            <Row label="Contact Person" value={supplier.contactName} />
            <Row label="Phone" value={supplier.contactPhone} />
            <Row
              label="GST Number"
              value={
                supplier.gstNumber
                  ? `${supplier.gstNumber} ${supplier.gstVerified ? '✓' : '(not verified)'}`
                  : 'Not provided'
              }
            />
          </Card.Content>
        </Card>

        {/* Document */}
        {supplier.idDocumentUrl && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                ID Document
              </Text>
              <Divider style={styles.divider} />
              <Text variant="bodySmall" style={styles.docNote}>
                Document on file. Access is audit-logged.
              </Text>
              {/* In a full build: open signed URL in WebBrowser */}
              <Button
                mode="outlined"
                style={{ marginTop: 8 }}
                onPress={() =>
                  Alert.alert('Document', 'Signed URL viewer — coming in P4 (Uploads).')
                }
              >
                View Document
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Rejection note (if rejected) */}
        {supplier.verificationStatus === 'REJECTED' && supplier.verificationNote && (
          <Card style={[styles.card, styles.rejectedCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleSmall" style={styles.rejectedTitle}>
                Rejection Reason
              </Text>
              <Text variant="bodyMedium" style={styles.rejectedNote}>
                {supplier.verificationNote}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canApprove && (
            <Button
              mode="contained"
              onPress={handleApprove}
              loading={verifyMutation.isPending}
              disabled={verifyMutation.isPending}
              style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
            >
              Approve
            </Button>
          )}
          {canReject && (
            <Button
              mode="outlined"
              onPress={() => setRejectModalVisible(true)}
              disabled={verifyMutation.isPending}
              style={styles.actionBtn}
              textColor="#F44336"
            >
              Reject
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Reject modal */}
      <Portal>
        <Modal
          visible={rejectModalVisible}
          onDismiss={() => {
            setRejectModalVisible(false);
            setRejectNote('');
            setNoteError('');
          }}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Rejection Reason
          </Text>
          <TextInput
            label="Note (required)"
            value={rejectNote}
            onChangeText={(t) => {
              setRejectNote(t);
              if (t.trim()) setNoteError('');
            }}
            mode="outlined"
            multiline
            numberOfLines={3}
            error={!!noteError}
            style={styles.noteInput}
          />
          {noteError ? (
            <Text style={styles.inputError}>{noteError}</Text>
          ) : null}
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setRejectModalVisible(false);
                setRejectNote('');
                setNoteError('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleRejectSubmit}
              loading={verifyMutation.isPending}
              disabled={verifyMutation.isPending}
              buttonColor="#F44336"
            >
              Reject
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#757575' },
  errorText: { color: '#F44336' },
  statusRow: { alignItems: 'flex-start', marginBottom: 4 },
  statusChip: { borderRadius: 12 },
  statusChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  rejectedCard: { borderLeftWidth: 4, borderLeftColor: '#F44336' },
  sectionTitle: { fontWeight: '700', color: '#212121', marginBottom: 4 },
  divider: { marginBottom: 10 },
  row: { paddingVertical: 6 },
  rowLabel: { color: '#9E9E9E', marginBottom: 2 },
  rowValue: { color: '#212121' },
  docNote: { color: '#757575' },
  rejectedTitle: { color: '#F44336', fontWeight: '700', marginBottom: 4 },
  rejectedNote: { color: '#424242' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
  modal: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontWeight: '700', marginBottom: 12 },
  noteInput: { marginBottom: 4 },
  inputError: { color: '#F44336', fontSize: 12, marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
