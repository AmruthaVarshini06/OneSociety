import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, TextInput, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVerificationQueue } from '../../../../src/services/service-hub-admin';
import { reviewProvider } from '../../../../src/services/service-hub-providers';

export default function VerificationQueueScreen() {
  const queryClient = useQueryClient();

  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-verification-queue'],
    queryFn: async () => {
      const res = await getVerificationQueue();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      providerId,
      decision,
      notes,
    }: {
      providerId: string;
      decision: 'APPROVE' | 'REJECT';
      notes?: string;
    }) => {
      return reviewProvider(providerId, { decision, notes: notes || '' });
    },
    onSuccess: (_, vars) => {
      setRejectDialogVisible(false);
      setRejectNote('');
      setSelectedProviderId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-verification-queue'] });
      Alert.alert(
        'Status Updated',
        vars.decision === 'APPROVE'
          ? 'Provider has been approved and awarded the "Verified by President" badge!'
          : 'Provider application has been rejected with feedback.',
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Provider Verification Queue</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Review documents and issue verified credentials. Seekers only see verified providers.
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && queue.length === 0 && (
        <Card style={styles.card} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600', color: '#757575' }}>
              ✓ Verification Queue is Clear
            </Text>
            <Text variant="bodySmall" style={{ color: '#9E9E9E', marginTop: 4 }}>
              No providers waiting for verification approval.
            </Text>
          </Card.Content>
        </Card>
      )}

      {queue.map((p: any) => {
        const isNeighbour = p.providerType === 'INTERNAL';

        return (
          <Card key={p._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>{p.name}</Text>
                  <Text variant="bodySmall" style={{ color: '#616161' }}>
                    {isNeighbour ? `🏡 Neighbour (Flat ${p.flatCode || 'Resident'})` : `👤 External Outsider (${p.accountType})`}
                  </Text>
                </View>
                <Chip compact style={{ backgroundColor: '#FFF9C4' }}>
                  Pending Verification
                </Chip>
              </View>

              <Divider />

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Category:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{p.categorySlug}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Phone:</Text>
                <Text variant="bodyMedium">{p.phone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Experience:</Text>
                <Text variant="bodyMedium">{p.experienceYears || 0} years</Text>
              </View>

              <Text variant="bodySmall" style={{ color: '#424242' }}>
                Bio: {p.bio || 'No bio provided'}
              </Text>

              {p.optionsOffered && p.optionsOffered.length > 0 && (
                <View style={styles.optsWrap}>
                  {p.optionsOffered.map((opt: string, i: number) => (
                    <Chip key={i} compact style={{ backgroundColor: '#ECEFF1' }}>{opt}</Chip>
                  ))}
                </View>
              )}

              <View style={styles.btnRow}>
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  compact
                  loading={reviewMutation.isPending && selectedProviderId === p._id}
                  onPress={() => {
                    setSelectedProviderId(p._id);
                    reviewMutation.mutate({ providerId: p._id, decision: 'APPROVE' });
                  }}
                >
                  Approve (Verify)
                </Button>

                <Button
                  mode="outlined"
                  textColor="#D32F2F"
                  compact
                  onPress={() => {
                    setSelectedProviderId(p._id);
                    setRejectDialogVisible(true);
                  }}
                >
                  Reject with Note
                </Button>
              </View>
            </Card.Content>
          </Card>
        );
      })}

      {}
      <Portal>
        <Dialog visible={rejectDialogVisible} onDismiss={() => setRejectDialogVisible(false)}>
          <Dialog.Title>Reject Provider Application</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall">
              Explain what documents or corrections are required. The provider can re-upload.
            </Text>
            <TextInput
              label="Rejection Reason / Note"
              value={rejectNote}
              onChangeText={setRejectNote}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="e.g. Please provide clear address proof or police clearance letter..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#D32F2F"
              loading={reviewMutation.isPending}
              disabled={!rejectNote.trim()}
              onPress={() => {
                if (selectedProviderId) {
                  reviewMutation.mutate({
                    providerId: selectedProviderId,
                    decision: 'REJECT',
                    notes: rejectNote,
                  });
                }
              }}
            >
              Confirm Rejection
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#4A148C' },
  subtitle: { color: '#6A1B9A', marginTop: 2 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#757575' },
  optsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
