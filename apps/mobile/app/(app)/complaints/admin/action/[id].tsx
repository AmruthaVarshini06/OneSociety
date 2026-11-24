import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
  RadioButton,
  Switch,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getClusterDetails,
  getSuggestedVendors,
  getLocalVendors,
  markContacted,
  startWorkInProgress,
  markSolved,
  recordCost,
  recordPayment,
  markOutOfScope,
  overridePriority,
  checkVendorClash,
} from '../../../../../src/services/complaints';

export default function PresidentIssueActionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'wip' | 'solve' | 'cost' | 'admin'>('contact');

  const [suggestedVendors, setSuggestedVendors] = useState<any[]>([]);
  const [vendorType, setVendorType] = useState<'SERVICE_HUB' | 'LOCAL'>('SERVICE_HUB');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorTrade, setVendorTrade] = useState('');
  const [visitDate, setVisitDate] = useState('2026-11-25');
  const [expectedCompletion, setExpectedCompletion] = useState('2026-11-26');
  const [contactNotes, setContactNotes] = useState('');
  const [allowAdditionalVendor, setAllowAdditionalVendor] = useState(false);
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  const [wipNote, setWipNote] = useState('Technician arrived on site with spare parts. Disassembled panel.');
  const [wipPhotos, setWipPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
  ]);

  const [solvedPhotos, setSolvedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=500',
  ]);
  const [solvedNote, setSolvedNote] = useState('Wiring and breaker replaced. Tested under load, all working.');

  const [serviceChargeRs, setServiceChargeRs] = useState('1200');
  const [partsChargeRs, setPartsChargeRs] = useState('650');
  const [otherChargeRs, setOtherChargeRs] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('UPI');
  const [paymentRef, setPaymentRef] = useState('UPI-REF-984321');
  const [costWarning, setCostWarning] = useState<string | null>(null);

  const [overrideLevel, setOverrideLevel] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [overrideScore, setOverrideScore] = useState('75');
  const [overrideReason, setOverrideReason] = useState('');
  const [outOfScopeReason, setOutOfScopeReason] = useState('');

  const [saving, setSaving] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await getClusterDetails(id as string);
      const data = res.data;
      setIssue(data);

      if (data.assignedVendors?.length > 0) {
        const v = data.assignedVendors[0];
        setVendorName(v.vendorName || '');
        setVendorPhone(v.vendorPhone || '');
        setVendorTrade(v.trade || '');
      }

      const vRes = await getSuggestedVendors(data.category);
      setSuggestedVendors(vRes.data.vendors || []);
      if (vRes.data.vendors?.length > 0) {
        const first = vRes.data.vendors[0];
        setVendorType(first.source);
        setSelectedVendorId(first.id);
        setVendorName(first.name);
        setVendorPhone(first.phone);
        setVendorTrade(first.trade);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const runClashCheck = async (phone: string, date: string) => {
    if (!phone || !date) return;
    try {
      const res = await checkVendorClash(phone, date, id as string);
      if (res.data.hasClash) {
        setClashWarning(
          `Schedule clash warning: Vendor has other jobs on this date (${res.data.clashingIssues.map((i: any) => i.title).join(', ')})`
        );
      } else {
        setClashWarning(null);
      }
    } catch (err) {
      console.warn('Clash check failed:', err);
    }
  };

  const handleSelectVendor = (v: any) => {
    setVendorType(v.source);
    setSelectedVendorId(v.id);
    setVendorName(v.name);
    setVendorPhone(v.phone);
    setVendorTrade(v.trade);
    runClashCheck(v.phone, visitDate);
  };

  const handleMarkContacted = async () => {
    if (!vendorName.trim() || !vendorPhone.trim() || !vendorTrade.trim()) {
      Alert.alert('Required Fields', 'Vendor name, phone, and trade are required.');
      return;
    }

    setSaving(true);
    try {
      await markContacted(id as string, {
        vendorType,
        vendorId: selectedVendorId || undefined,
        vendorName: vendorName.trim(),
        vendorPhone: vendorPhone.trim(),
        trade: vendorTrade.trim(),
        visitDate: visitDate ? new Date(visitDate) : undefined,
        expectedCompletion: expectedCompletion ? new Date(expectedCompletion) : undefined,
        notes: contactNotes.trim(),
        allowAdditionalVendor,
        clientVersion: issue.version,
      });

      Alert.alert(
        'Vendor Contacted',
        'Status updated to CONTACTED. This issue has now left your "Needs Action" list.',
        [{ text: 'OK', onPress: () => fetchDetails() }]
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert('Conflict', 'This issue was updated from another device. Please refresh.', [
          { text: 'Refresh', onPress: () => fetchDetails() },
        ]);
      } else {
        Alert.alert('Error', err.response?.data?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStartWip = async () => {
    setSaving(true);
    try {
      await startWorkInProgress(id as string, {
        note: wipNote.trim(),
        photos: wipPhotos,
        clientVersion: issue.version,
      });
      Alert.alert('Work In Progress', 'Status updated to IN_PROGRESS. Residents have been notified.');
      fetchDetails();
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert('Conflict', 'This issue was updated from another device. Please refresh.');
      } else {
        Alert.alert('Error', err.response?.data?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSolved = async () => {
    if (solvedPhotos.length === 0) {
      Alert.alert('Photo Required', 'At least one after photo is required to mark an issue as solved.');
      return;
    }

    setSaving(true);
    try {
      await markSolved(id as string, {
        afterPhotos: solvedPhotos,
        completionNote: solvedNote.trim(),
        clientVersion: issue.version,
      });
      Alert.alert('Issue Solved', 'Status updated to SOLVED. 7-day resident review window has opened.');
      fetchDetails();
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert('Conflict', 'This issue was updated from another device. Please refresh.');
      } else {
        Alert.alert('Error', err.response?.data?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRecordCostAndPayment = async () => {
    const servicePaise = (parseFloat(serviceChargeRs) || 0) * 100;
    const partsPaise = (parseFloat(partsChargeRs) || 0) * 100;
    const otherPaise = (parseFloat(otherChargeRs) || 0) * 100;
    const totalPaise = servicePaise + partsPaise + otherPaise;

    if (totalPaise <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid cost breakdown.');
      return;
    }

    setSaving(true);
    try {
      const costRes = await recordCost(id as string, {
        breakdown: [
          { itemType: 'VENDOR_SERVICE', description: 'Vendor service / labor charges', amountPaise: servicePaise },
          { itemType: 'GOODS_PARTS', description: 'Parts and materials replaced', amountPaise: partsPaise },
          ...(otherPaise > 0 ? [{ itemType: 'OTHER', description: 'Other expenses', amountPaise: otherPaise }] : []),
        ],
        clientVersion: issue.version,
      });

      if (costRes.data.isHighCostWarning) {
        setCostWarning(costRes.data.warningMessage);
      }

      await recordPayment(id as string, {
        paidToVendor: vendorName || 'Vendor',
        amountPaise: totalPaise,
        paymentMode,
        referenceNumber: paymentRef.trim(),
        clientVersion: costRes.data.cluster?.version || issue.version + 1,
      });

      Alert.alert('Cost & Payment Recorded', 'Cost breakdown and payment record saved and visible for audit.');
      fetchDetails();
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert('Conflict', 'This issue was updated from another device. Please refresh.');
      } else {
        Alert.alert('Error', err.response?.data?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOverridePriority = async () => {
    if (!overrideReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear reason for overriding the AI priority.');
      return;
    }

    setSaving(true);
    try {
      await overridePriority(id as string, {
        priorityLevel: overrideLevel,
        priorityScore: parseInt(overrideScore, 10) || 75,
        reason: overrideReason.trim(),
        clientVersion: issue.version,
      });
      Alert.alert('Priority Overridden', 'Priority updated and logged in the audit trail.');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkOutOfScope = async () => {
    if (!outOfScopeReason.trim()) {
      Alert.alert('Reason Required', 'Please explain why this is out of society scope.');
      return;
    }

    setSaving(true);
    try {
      await markOutOfScope(id as string, {
        reason: outOfScopeReason.trim(),
        pointsToServiceHub: true,
        clientVersion: issue.version,
      });
      Alert.alert('Marked Out of Scope', 'Residents notified with a link to ServiceHub.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !issue) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {}
      <Card style={styles.summaryCard} mode="contained">
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryId}>#{issue.clusterNumber}</Text>
            <Chip style={styles.statusChip}>{issue.status}</Chip>
            <Chip style={styles.prioChip}>{issue.priorityLevel} ({issue.priorityScore})</Chip>
          </View>
          <Text style={styles.summaryTitle}>{issue.title}</Text>
          <Text style={styles.versionTag}>Version: v{issue.version} (Optimistic Locking Guard)</Text>
        </Card.Content>
      </Card>

      {}
      <SegmentedButtons
        value={activeTab}
        onValueChange={v => setActiveTab(v as any)}
        buttons={[
          { value: 'contact', label: '1. Contact' },
          { value: 'wip', label: '2. WIP' },
          { value: 'solve', label: '3. Solved' },
          { value: 'cost', label: '4. Cost' },
          { value: 'admin', label: 'Admin' },
        ]}
        style={styles.segButtons}
      />

      {}
      {activeTab === 'contact' && (
        <Card style={styles.formCard} mode="elevated">
          <Card.Content>
            <Text style={styles.formTitle}>📞 Step 3: Contact Vendor</Text>
            <Text style={styles.formSub}>
              Selecting a vendor and marking CONTACTED removes this issue from your &quot;Needs Action&quot; list.
            </Text>

            {}
            <Text style={styles.fieldLabel}>Suggested Vendors ({issue.category})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vendorScroll}>
              {suggestedVendors.map((v, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.vendorCardOption,
                    selectedVendorId === v.id && styles.vendorCardSelected,
                  ]}
                  onPress={() => handleSelectVendor(v)}
                >
                  <Text style={styles.vendorCardName}>{v.name}</Text>
                  <Text style={styles.vendorCardTrade}>{v.trade} • {v.source === 'SERVICE_HUB' ? 'ServiceHub' : 'Local'}</Text>
                  <Text style={styles.vendorCardRating}>⭐ {v.rating} ({v.jobsCompleted} jobs)</Text>
                  <Text style={styles.vendorCardPhone}>📞 {v.phone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Divider style={styles.divider} />

            <TextInput
              label="Vendor Name *"
              value={vendorName}
              onChangeText={setVendorName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Vendor Phone Number *"
              value={vendorPhone}
              onChangeText={t => {
                setVendorPhone(t);
                runClashCheck(t, visitDate);
              }}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              label="Trade / Specialty *"
              value={vendorTrade}
              onChangeText={setVendorTrade}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Scheduled Visit Date (YYYY-MM-DD)"
              value={visitDate}
              onChangeText={d => {
                setVisitDate(d);
                runClashCheck(vendorPhone, d);
              }}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Expected Completion Date (YYYY-MM-DD)"
              value={expectedCompletion}
              onChangeText={setExpectedCompletion}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Instructions / Notes for Vendor"
              value={contactNotes}
              onChangeText={setContactNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            {}
            {clashWarning && (
              <Card style={styles.warningCard} mode="contained">
                <Card.Content>
                  <Text style={styles.warningText}>⚠️ {clashWarning}</Text>
                </Card.Content>
              </Card>
            )}

            {}
            {issue.assignedVendors?.length > 0 && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Explicitly add another vendor to this job</Text>
                <Switch value={allowAdditionalVendor} onValueChange={setAllowAdditionalVendor} />
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleMarkContacted}
              loading={saving}
              disabled={saving}
              style={styles.actionBtn}
            >
              Mark Contacted (Move Out of Needs Action)
            </Button>
          </Card.Content>
        </Card>
      )}

      {}
      {activeTab === 'wip' && (
        <Card style={styles.formCard} mode="elevated">
          <Card.Content>
            <Text style={styles.formTitle}>🔨 Step 4: Work In Progress</Text>
            <Text style={styles.formSub}>Add progress updates, notes, and photos from the site.</Text>

            <TextInput
              label="Progress Note *"
              value={wipNote}
              onChangeText={setWipNote}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Site Photos: {wipPhotos.length} attached</Text>

            <Button
              mode="contained"
              onPress={handleStartWip}
              loading={saving}
              disabled={saving}
              style={styles.actionBtn}
            >
              Update to WORK IN PROGRESS
            </Button>
          </Card.Content>
        </Card>
      )}

      {}
      {activeTab === 'solve' && (
        <Card style={styles.formCard} mode="elevated">
          <Card.Content>
            <Text style={styles.formTitle}>✅ Step 5: Mark Solved</Text>
            <Text style={styles.formSub}>Upload after photos to prove the repair is complete.</Text>

            <TextInput
              label="Completion Note"
              value={solvedNote}
              onChangeText={setSolvedNote}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>After Photos (Required) *</Text>
            <Chip icon="camera" style={styles.chipUploaded}>
              {solvedPhotos.length} After photo(s) ready
            </Chip>

            <Button
              mode="contained"
              onPress={handleMarkSolved}
              loading={saving}
              disabled={saving}
              style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}
            >
              Mark Issue Solved
            </Button>
          </Card.Content>
        </Card>
      )}

      {}
      {activeTab === 'cost' && (
        <Card style={styles.formCard} mode="elevated">
          <Card.Content>
            <Text style={styles.formTitle}>💰 Step 6: Cost & Payment</Text>
            <Text style={styles.formSub}>Transparent accounting visible to all residents.</Text>

            <TextInput
              label="Vendor Service Charges (Rs.) *"
              value={serviceChargeRs}
              onChangeText={setServiceChargeRs}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="New Goods / Spare Parts (Rs.)"
              value={partsChargeRs}
              onChangeText={setPartsChargeRs}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Other Charges (Rs.)"
              value={otherChargeRs}
              onChangeText={setOtherChargeRs}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            {costWarning && (
              <Card style={styles.warningCard} mode="contained">
                <Card.Content>
                  <Text style={styles.warningText}>⚠️ {costWarning}</Text>
                </Card.Content>
              </Card>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.fieldLabel}>Payment Mode</Text>
            <RadioButton.Group onValueChange={v => setPaymentMode(v as any)} value={paymentMode}>
              <View style={styles.radioRow}>
                <RadioButton value="UPI" />
                <Text style={styles.radioText}>UPI</Text>
                <RadioButton value="CASH" />
                <Text style={styles.radioText}>Cash</Text>
                <RadioButton value="BANK_TRANSFER" />
                <Text style={styles.radioText}>Bank Transfer</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              label="Payment Reference / Transaction ID"
              value={paymentRef}
              onChangeText={setPaymentRef}
              mode="outlined"
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleRecordCostAndPayment}
              loading={saving}
              disabled={saving}
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
            >
              Record Cost & Mark Paid
            </Button>
          </Card.Content>
        </Card>
      )}

      {}
      {activeTab === 'admin' && (
        <View>
          {}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content>
              <Text style={styles.formTitle}>⚡ Override AI Priority</Text>
              <View style={styles.prioRow}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                  <Chip
                    key={p}
                    selected={overrideLevel === p}
                    onPress={() => setOverrideLevel(p)}
                    style={styles.prioChipItem}
                  >
                    {p}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Custom Priority Score (0 - 100)"
                value={overrideScore}
                onChangeText={setOverrideScore}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Reason for Override *"
                value={overrideReason}
                onChangeText={setOverrideReason}
                mode="outlined"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleOverridePriority}
                loading={saving}
                disabled={saving}
                style={styles.actionBtn}
              >
                Save Priority Override
              </Button>
            </Card.Content>
          </Card>

          {}
          <Card style={[styles.formCard, { marginTop: 12 }]} mode="elevated">
            <Card.Content>
              <Text style={styles.formTitle}>🚫 Mark Out of Society Scope</Text>
              <Text style={styles.formSub}>
                Rejects flat-internal issues and directs residents to ServiceHub providers.
              </Text>

              <TextInput
                label="Reason for marking out of scope *"
                value={outOfScopeReason}
                onChangeText={setOutOfScopeReason}
                multiline
                numberOfLines={2}
                mode="outlined"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleMarkOutOfScope}
                loading={saving}
                disabled={saving}
                style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
              >
                Mark Out of Scope
              </Button>
            </Card.Content>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 14, paddingBottom: 60 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryId: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  statusChip: { height: 24 },
  prioChip: { height: 24, backgroundColor: '#EEF2FF' },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  versionTag: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  segButtons: { marginBottom: 12 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 12 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  formSub: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  vendorScroll: { marginBottom: 10 },
  vendorCardOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    width: 170,
  },
  vendorCardSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  vendorCardName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  vendorCardTrade: { fontSize: 11, color: '#64748B', marginVertical: 2 },
  vendorCardRating: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  vendorCardPhone: { fontSize: 11, color: '#0284C7', marginTop: 2 },
  divider: { marginVertical: 12 },
  input: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  warningCard: { backgroundColor: '#FEF3C7', borderRadius: 8, marginBottom: 10 },
  warningText: { fontSize: 12, color: '#92400E' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { fontSize: 12, color: '#475569', flex: 1, marginRight: 8 },
  actionBtn: { marginTop: 8, borderRadius: 8 },
  chipUploaded: { backgroundColor: '#DCFCE7', alignSelf: 'flex-start', marginBottom: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radioText: { marginRight: 16, fontSize: 13 },
  prioRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  prioChipItem: { height: 32 },
});
