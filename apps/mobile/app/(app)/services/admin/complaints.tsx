import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, TextInput, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminComplaints, resolveComplaint } from '../../../../src/services/service-hub-admin';

export default function AdminComplaintsScreen() {
  const queryClient = useQueryClient();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [notes, setNotes] = useState('');

  const { data: complaints = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-complaints-list'],
    queryFn: async () => {
      const res = await getAdminComplaints();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedComplaintId) return;
      return resolveComplaint(selectedComplaintId, { status: resolutionAction, notes });
    },
    onSuccess: () => {
      setDialogVisible(false);
      setNotes('');
      setSelectedComplaintId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-complaints-list'] });
      Alert.alert('Complaint Updated', `Complaint has been marked ${resolutionAction.toLowerCase()}.`);
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
        <Text variant="headlineSmall" style={styles.title}>Complaints & Grievances</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Investigate resident complaints against service providers
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {!isLoading && complaints.length === 0 && (
        <Card style={styles.card} mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600', color: '#757575' }}>
              ✓ No Open Complaints
            </Text>
            <Text variant="bodySmall" style={{ color: '#9E9E9E', marginTop: 4 }}>
              Society residents have reported no active service issues.
            </Text>
          </Card.Content>
        </Card>
      )}

      {complaints.map((c: any) => {
        const isResolved = c.status === 'RESOLVED' || c.status === 'DISMISSED';

        return (
          <Card key={c._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#C62828' }}>
                    {c.category}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#616161' }}>
                    Provider: {c.againstProviderId?.name || 'Provider'}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: isResolved ? '#E8F5E9' : '#FFEBEE' }}
                >
                  {c.status}
                </Chip>
              </View>

              <Divider />

              <Text variant="bodyMedium" style={{ color: '#212121' }}>
                Description: {c.description}
              </Text>

              {c.resolutionNotes && (
                <Text variant="bodySmall" style={{ color: '#2E7D32', fontStyle: 'italic' }}>
                  Resolution: {c.resolutionNotes}
                </Text>
              )}

              {!isResolved && (
                <View style={styles.btnRow}>
                  <Button
                    mode="contained"
                    buttonColor="#2E7D32"
                    compact
                    onPress={() => {
                      setSelectedComplaintId(c._id);
                      setResolutionAction('RESOLVED');
                      setDialogVisible(true);
                    }}
                  >
                    Resolve with Note
                  </Button>
                  <Button
                    mode="outlined"
                    textColor="#757575"
                    compact
                    onPress={() => {
                      setSelectedComplaintId(c._id);
                      setResolutionAction('DISMISSED');
                      setDialogVisible(true);
                    }}
                  >
                    Dismiss
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        );
      })}

      {}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {resolutionAction === 'RESOLVED' ? 'Resolve Complaint' : 'Dismiss Complaint'}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <TextInput
              label="President's Decision / Action Taken"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="e.g. Warning issued to provider, refund processed, or no violation found."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor={resolutionAction === 'RESOLVED' ? '#2E7D32' : '#757575'}
              loading={resolveMutation.isPending}
              disabled={!notes.trim()}
              onPress={() => resolveMutation.mutate()}
            >
              Submit Ruling
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
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
