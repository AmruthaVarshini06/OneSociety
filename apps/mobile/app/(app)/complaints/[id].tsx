import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  Divider,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getClusterDetails,
  reopenIssue,
  confirmIssueFixed,
  withdrawComplaint,
} from '../../../src/services/complaints';
import { useAuthStore } from '../../../src/store/auth';

export default function IssueDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const isPresident = user?.role === 'president';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issue, setIssue] = useState<any>(null);

  // Reopen Dialog
  const [reopenVisible, setReopenVisible] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenPhotos, setReopenPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500',
  ]);
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await getClusterDetails(id as string);
      setIssue(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load issue details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const handleConfirmFixed = async () => {
    try {
      await confirmIssueFixed(id as string);
      Alert.alert('Thank you!', 'Your confirmation has been recorded.');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to confirm.');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      Alert.alert('Reason Required', 'Please explain why the issue is not fixed.');
      return;
    }
    if (reopenPhotos.length === 0) {
      Alert.alert('Photo Required', 'Please provide a photo showing the issue still exists.');
      return;
    }

    setSubmittingReopen(true);
    try {
      await reopenIssue(id as string, {
        reason: reopenReason.trim(),
        photos: reopenPhotos,
      });
      setReopenVisible(false);
      Alert.alert('Issue Reopened', 'The issue has been reopened and placed at the top of the priority queue.');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to reopen issue.');
    } finally {
      setSubmittingReopen(false);
    }
  };

  if (loading || !issue) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#B00020';
      case 'HIGH':
        return '#D97706';
      case 'MEDIUM':
        return '#2563EB';
      default:
        return '#64748B';
    }
  };

  const canReopen = issue.status === 'SOLVED';
  const myComplaint = issue.complaintIds?.find((c: any) => c.residentId === user?.userId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Card */}
      <Card style={styles.headerCard} mode="elevated">
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.clusterIdText}>#{issue.clusterNumber}</Text>
            <View style={styles.badgeGroup}>
              <Chip style={[styles.priorityBadge, { backgroundColor: getPriorityColor(issue.priorityLevel) + '22' }]}>
                <Text style={{ color: getPriorityColor(issue.priorityLevel), fontWeight: '700' }}>
                  {issue.priorityLevel} ({issue.priorityScore})
                </Text>
              </Chip>
              <Chip style={styles.statusBadge}>{issue.status}</Chip>
            </View>
          </View>

          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.location}>
            📍 {issue.location?.specificArea}
            {issue.location?.block ? ` • Block ${issue.location.block}` : ''}
            {issue.location?.floor ? ` • Floor ${issue.location.floor}` : ''}
          </Text>

          {issue.isSafetyOverride && (
            <Chip icon="alert-octagon" style={styles.safetyChip} textStyle={styles.safetyText}>
              SAFETY OVERRIDE: Danger to Life or Safety
            </Chip>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>👥 {issue.reportCount} reports ({issue.affectedResidentsCount} residents)</Text>
            <Text style={styles.summaryItem}>🕒 Reported {new Date(issue.firstReportedAt).toLocaleDateString()}</Text>
          </View>

          {issue.priorityReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>🤖 AI Priority Engine:</Text>
              <Text style={styles.reasonContent}>{issue.priorityReason}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* President Action Shortcut */}
      {isPresident && (
        <Card
          style={styles.presidentActionCard}
          mode="contained"
          onPress={() => router.push(`/(app)/complaints/admin/action/${issue._id}` as any)}
        >
          <Card.Content style={styles.presidentActionContent}>
            <View>
              <Text style={styles.presidentActionTitle}>👑 President Workflow Tools</Text>
              <Text style={styles.presidentActionSub}>Contact vendor, update progress, record cost & payment</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => router.push(`/(app)/complaints/admin/action/${issue._id}` as any)}
            >
              Manage
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Photos Section */}
      <Card style={styles.sectionCard} mode="contained">
        <Card.Content>
          <Text style={styles.sectionTitle}>📸 Evidence & Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {issue.complaintIds?.flatMap((c: any) => c.photos || []).map((uri: string, idx: number) => (
              <Image key={`comp-${idx}`} source={{ uri }} style={styles.galleryImage} />
            ))}
            {issue.afterPhotos?.map((uri: string, idx: number) => (
              <View key={`after-${idx}`} style={styles.afterPhotoWrap}>
                <Image source={{ uri }} style={styles.galleryImage} />
                <Chip style={styles.afterTag} compact>After Fix</Chip>
              </View>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {/* Assigned Vendor */}
      {issue.assignedVendors && issue.assignedVendors.length > 0 && (
        <Card style={styles.sectionCard} mode="contained">
          <Card.Content>
            <Text style={styles.sectionTitle}>🔧 Assigned Vendor</Text>
            {issue.assignedVendors.map((v: any, idx: number) => (
              <View key={idx} style={styles.vendorRow}>
                <View>
                  <Text style={styles.vendorName}>{v.vendorName}</Text>
                  <Text style={styles.vendorTrade}>{v.trade} • {v.vendorType === 'SERVICE_HUB' ? 'ServiceHub Pro' : 'Local Vendor'}</Text>
                  {isPresident && <Text style={styles.vendorPhone}>📞 {v.vendorPhone}</Text>}
                  {v.visitDate && (
                    <Text style={styles.vendorVisit}>Visit: {new Date(v.visitDate).toLocaleDateString()}</Text>
                  )}
                </View>
                <Chip style={styles.vendorStatusChip} compact>{v.status}</Chip>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Timeline Section */}
      <Card style={styles.sectionCard} mode="contained">
        <Card.Content>
          <Text style={styles.sectionTitle}>⏳ Progress Timeline</Text>

          {/* First Reported */}
          <View style={styles.timelineItem}>
            <Text style={styles.timelineDot}>🟢</Text>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineStep}>Issue Reported</Text>
              <Text style={styles.timelineDate}>{new Date(issue.firstReportedAt).toLocaleString()}</Text>
              <Text style={styles.timelineText}>Logged with priority score {issue.priorityScore}.</Text>
            </View>
          </View>

          {/* Contacted */}
          {issue.assignedVendors && issue.assignedVendors.length > 0 && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineDot}>🔵</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineStep}>Vendor Contacted</Text>
                <Text style={styles.timelineDate}>{new Date(issue.assignedVendors[0].contactedAt).toLocaleString()}</Text>
                <Text style={styles.timelineText}>
                  President contacted {issue.assignedVendors[0].vendorName} ({issue.assignedVendors[0].trade}).
                </Text>
              </View>
            </View>
          )}

          {/* Progress Updates */}
          {issue.progressUpdates?.map((u: any, idx: number) => (
            <View key={idx} style={styles.timelineItem}>
              <Text style={styles.timelineDot}>🟠</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineStep}>Work In Progress</Text>
                <Text style={styles.timelineDate}>{new Date(u.updatedAt).toLocaleString()}</Text>
                <Text style={styles.timelineText}>{u.note}</Text>
              </View>
            </View>
          ))}

          {/* Solved */}
          {issue.solvedAt && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineDot}>✅</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineStep}>Issue Marked Solved</Text>
                <Text style={styles.timelineDate}>{new Date(issue.solvedAt).toLocaleString()}</Text>
                <Text style={styles.timelineText}>After photo uploaded by president. 7-day review window started.</Text>
              </View>
            </View>
          )}

          {/* Reopen History */}
          {issue.reopenHistory?.map((r: any, idx: number) => (
            <View key={idx} style={styles.timelineItem}>
              <Text style={styles.timelineDot}>🔴</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineStep}>Issue Reopened (Flat {r.residentFlatCode})</Text>
                <Text style={styles.timelineDate}>{new Date(r.reopenedAt).toLocaleString()}</Text>
                <Text style={styles.timelineText}>Reason: {r.reason}</Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Cost & Payment Breakdown (Transparent to all residents) */}
      {issue.costs?.totalAmountPaise > 0 && (
        <Card style={styles.costCard} mode="contained">
          <Card.Content>
            <Text style={styles.costHeader}>💰 Transparent Cost & Payment</Text>
            <Text style={styles.totalAmount}>
              Total Cost: Rs. {(issue.costs.totalAmountPaise / 100).toLocaleString()}
            </Text>

            <Divider style={styles.costDivider} />

            {issue.costs.breakdown?.map((b: any, idx: number) => (
              <View key={idx} style={styles.costLine}>
                <Text style={styles.costItemDesc}>{b.description} ({b.itemType.replace('_', ' ')})</Text>
                <Text style={styles.costItemAmount}>Rs. {(b.amountPaise / 100).toLocaleString()}</Text>
              </View>
            ))}

            {issue.payment?.isPaid && (
              <View style={styles.paymentBox}>
                <Text style={styles.paymentStatusText}>
                  ✓ Paid to {issue.payment.paidToVendor} via {issue.payment.paymentMode} on{' '}
                  {new Date(issue.payment.paidAt).toLocaleDateString()}
                </Text>
                {issue.payment.referenceNumber && (
                  <Text style={styles.paymentRef}>Ref: {issue.payment.referenceNumber}</Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Resident Action Buttons */}
      <View style={styles.actionsSection}>
        {canReopen && (
          <View style={styles.reopenButtonGroup}>
            <Button
              mode="contained"
              icon="check-circle"
              onPress={handleConfirmFixed}
              style={styles.confirmFixedBtn}
            >
              Confirm Fixed
            </Button>
            <Button
              mode="outlined"
              icon="alert"
              textColor="#DC2626"
              onPress={() => setReopenVisible(true)}
              style={styles.reopenBtn}
            >
              Reopen Issue
            </Button>
          </View>
        )}

        <Button
          mode="text"
          icon="plus-box"
          onPress={() => router.push(`/(app)/complaints/new?linkToClusterId=${issue._id}` as any)}
        >
          Post another report for this issue
        </Button>
      </View>

      {/* Reopen Dialog */}
      <Portal>
        <Dialog visible={reopenVisible} onDismiss={() => setReopenVisible(false)}>
          <Dialog.Title>Reopen Issue</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogNotice}>
              If the problem was not solved or has re-occurred, reopening will return it to the top of the president&apos;s priority queue.
            </Text>
            <TextInput
              label="Why is this issue still not fixed? *"
              value={reopenReason}
              onChangeText={setReopenReason}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.dialogInput}
            />
            <Text style={styles.dialogPhotoText}>Evidence photo attached: ✓</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReopenVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleReopen}
              loading={submittingReopen}
              disabled={submittingReopen}
            >
              Reopen
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 14, paddingBottom: 50 },
  headerCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clusterIdText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  badgeGroup: { flexDirection: 'row', gap: 6 },
  priorityBadge: { height: 28 },
  statusBadge: { height: 28, backgroundColor: '#E2E8F0' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  location: { fontSize: 13, color: '#475569', marginBottom: 8 },
  safetyChip: { backgroundColor: '#FEE2E2', marginBottom: 10 },
  safetyText: { color: '#991B1B', fontWeight: '700', fontSize: 11 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  summaryItem: { fontSize: 12, color: '#64748B' },
  reasonBox: { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8, marginTop: 4 },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  reasonContent: { fontSize: 12, color: '#312E81', fontStyle: 'italic', marginTop: 2 },
  presidentActionCard: { backgroundColor: '#EEF2FF', borderRadius: 12, marginBottom: 12 },
  presidentActionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presidentActionTitle: { fontSize: 14, fontWeight: '700', color: '#312E81' },
  presidentActionSub: { fontSize: 11, color: '#4338CA', marginTop: 2 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  photoScroll: { flexDirection: 'row', gap: 10 },
  galleryImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  afterPhotoWrap: { position: 'relative' },
  afterTag: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#16A34A', height: 20 },
  vendorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  vendorName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  vendorTrade: { fontSize: 12, color: '#64748B', marginTop: 2 },
  vendorPhone: { fontSize: 12, color: '#0284C7', fontWeight: '600', marginTop: 2 },
  vendorVisit: { fontSize: 11, color: '#D97706', marginTop: 2 },
  vendorStatusChip: { height: 24 },
  timelineItem: { flexDirection: 'row', marginBottom: 14 },
  timelineDot: { fontSize: 14, marginRight: 10, marginTop: 2 },
  timelineBody: { flex: 1 },
  timelineStep: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  timelineDate: { fontSize: 11, color: '#94A3B8', marginVertical: 2 },
  timelineText: { fontSize: 12, color: '#475569' },
  costCard: { backgroundColor: '#F0FDF4', borderRadius: 12, marginBottom: 12 },
  costHeader: { fontSize: 15, fontWeight: '700', color: '#166534' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#15803D', marginTop: 4 },
  costDivider: { marginVertical: 8, backgroundColor: '#BBF7D0' },
  costLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  costItemDesc: { fontSize: 12, color: '#166534' },
  costItemAmount: { fontSize: 12, fontWeight: '700', color: '#166534' },
  paymentBox: { backgroundColor: '#DCFCE7', padding: 8, borderRadius: 6, marginTop: 8 },
  paymentStatusText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  paymentRef: { fontSize: 11, color: '#166534', marginTop: 2 },
  actionsSection: { marginTop: 8 },
  reopenButtonGroup: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  confirmFixedBtn: { flex: 1, backgroundColor: '#16A34A' },
  reopenBtn: { flex: 1, borderColor: '#DC2626' },
  dialogNotice: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  dialogInput: { backgroundColor: '#FFFFFF', marginBottom: 10 },
  dialogPhotoText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
});
