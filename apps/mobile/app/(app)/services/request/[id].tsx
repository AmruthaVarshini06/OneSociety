import React from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequest, respondToRequest, cancelRequest } from '../../../../src/services/service-hub-requests';
import { useAuthStore } from '../../../../src/store/auth';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  REQUESTED: { bg: '#E3F2FD', text: '#1565C0' },
  UNDER_DISCUSSION: { bg: '#FFF3E0', text: '#E65100' },
  AGREED: { bg: '#E8F5E9', text: '#2E7D32' },
  ACTIVE: { bg: '#E0F2F1', text: '#00695C' },
  COMPLETED: { bg: '#ECEFF1', text: '#455A64' },
  DECLINED: { bg: '#FFEBEE', text: '#C62828' },
  EXPIRED: { bg: '#F5F5F5', text: '#9E9E9E' },
  CANCELLED: { bg: '#F5F5F5', text: '#9E9E9E' },
  TERMINATED: { bg: '#FFEBEE', text: '#B71C1C' },
};

export default function ServiceRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => {
      const res = await getRequest(id);
      return res.data;
    },
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return respondToRequest(id, { action: 'ACCEPT' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      router.push(`/(app)/services/chat/${id}` as never);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      return respondToRequest(id, { action: 'DECLINE', declineReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      Alert.alert('Declined', 'Request has been declined.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return cancelRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      Alert.alert('Cancelled', 'Your request has been cancelled.');
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Request not found</Text>
      </View>
    );
  }

  const isSeeker = request.seekerId?.toString() === currentUser?.userId;
  const isProvider = request.providerUserId?.toString() === currentUser?.userId;
  const color = STATUS_COLORS[request.status] || { bg: '#ECEFF1', text: '#37474F' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <Card style={[styles.card, { backgroundColor: color.bg }]} mode="contained">
        <Card.Content style={styles.statusContent}>
          <Text variant="labelLarge" style={{ color: color.text, fontWeight: '700' }}>
            STATUS: {request.status.replace('_', ' ')}
          </Text>
          {request.status === 'REQUESTED' && (
            <Text variant="bodySmall" style={{ color: color.text, marginTop: 4 }}>
              ⏳ Awaiting provider response. Request expires in 24 hours if unaccepted.
            </Text>
          )}
          {request.declineReason && (
            <Text variant="bodySmall" style={{ color: color.text, marginTop: 4 }}>
              Reason: {request.declineReason}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Phone numbers privacy reveal */}
      {request.phoneNumbersRevealed ? (
        <Card style={[styles.card, styles.phoneCard]} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.phoneTitle}>📞 Contact Phone Numbers Unlocked</Text>
            <View style={styles.phoneRow}>
              <Text variant="bodyMedium">Seeker ({request.seekerName}): {request.seekerPhone}</Text>
            </View>
            <Text variant="labelSmall" style={{ color: '#546E7A', marginTop: 4 }}>
              Numbers are unlocked during negotiation and active work, and hidden 3 days after completion.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#78909C' }}>
              🔒 Phone numbers are masked for privacy until terms are opened for negotiation.
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Service details */}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Service Details" />
        <Card.Content style={{ gap: 8 }}>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Category:</Text>
            <Text variant="bodyMedium">{request.categorySlug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Service Option:</Text>
            <Text variant="titleSmall" style={{ color: '#1565C0', fontWeight: '700' }}>
              {request.optionSlug}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Duration Type:</Text>
            <Text variant="bodyMedium">{request.workType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Schedule Slot:</Text>
            <Text variant="bodyMedium">
              {request.dailyTimeSlot?.from} - {request.dailyTimeSlot?.to}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Dates:</Text>
            <Text variant="bodyMedium">
              {new Date(request.startDate).toDateString()}
              {request.endDate ? ` to ${new Date(request.endDate).toDateString()}` : ' (Ongoing)'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelMedium" style={styles.detailKey}>Flat Number:</Text>
            <Text variant="bodyMedium">{request.flatNumber || request.seekerFlatCode}</Text>
          </View>

          {request.proposedBudgetPaise && (
            <View style={styles.detailRow}>
              <Text variant="labelMedium" style={styles.detailKey}>Proposed Budget:</Text>
              <Text variant="titleSmall" style={{ color: '#2E7D32', fontWeight: '700' }}>
                ₹{(request.proposedBudgetPaise / 100).toFixed(0)}
              </Text>
            </View>
          )}

          <Divider style={{ marginVertical: 6 }} />
          <Text variant="labelMedium" style={styles.detailKey}>Requirements / Scope:</Text>
          <Text variant="bodyMedium" style={{ color: '#424242' }}>{request.requirementsText}</Text>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionWrap}>
        {/* Provider actions when REQUESTED */}
        {isProvider && request.status === 'REQUESTED' && (
          <View style={{ gap: 10 }}>
            <Button
              mode="contained"
              buttonColor="#2E7D32"
              loading={acceptMutation.isPending}
              onPress={() => acceptMutation.mutate()}
            >
              Accept & Start Chat
            </Button>
            <Button
              mode="outlined"
              textColor="#C62828"
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt('Decline Request', 'Enter reason for declining:', (reason) =>
                      declineMutation.mutate(reason || 'Unavailable for this time slot'),
                    )
                  : declineMutation.mutate('Unavailable for this time slot');
              }}
            >
              Decline (1-tap)
            </Button>
          </View>
        )}

        {/* Chat button for UNDER_DISCUSSION and onwards */}
        {['UNDER_DISCUSSION', 'AGREED', 'ACTIVE'].includes(request.status) && (
          <Button
            mode="contained"
            icon="chat"
            buttonColor="#1565C0"
            onPress={() => router.push(`/(app)/services/chat/${id}` as never)}
          >
            Open Negotiation Chat & Offer
          </Button>
        )}

        {/* Agreement link */}
        {request.agreedAgreementId && (
          <Button
            mode="outlined"
            icon="file-document"
            style={{ marginTop: 8 }}
            onPress={() =>
              router.push(`/(app)/services/agreements/${request.agreedAgreementId}` as never)
            }
          >
            View Locked Agreement
          </Button>
        )}

        {/* Seeker Cancel button */}
        {isSeeker && ['REQUESTED', 'UNDER_DISCUSSION'].includes(request.status) && (
          <Button
            mode="text"
            textColor="#D32F2F"
            style={{ marginTop: 8 }}
            onPress={() =>
              Alert.alert('Cancel Request', 'Are you sure you want to cancel this service request?', [
                { text: 'No' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
              ])
            }
          >
            Cancel Request
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  statusContent: { paddingVertical: 12 },
  phoneCard: { backgroundColor: '#E8F5E9', borderColor: '#81C784', borderWidth: 1 },
  phoneTitle: { fontWeight: '700', color: '#1B5E20' },
  phoneRow: { marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { color: '#616161', fontWeight: '500' },
  actionWrap: { paddingVertical: 8 },
});
