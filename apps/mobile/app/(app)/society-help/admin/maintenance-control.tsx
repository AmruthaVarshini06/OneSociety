import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  recordExpense,
  recordOtherIncome,
  recordWatchmanSalary,
  recordOfflineMaintenancePayment,
  linkComplaintExpense,
} from '../../../../src/services/society-help';

export default function MaintenanceControlScreen() {
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'OFFLINE' | 'SALARY' | 'COMPLAINT'>('EXPENSE');

  // Expense form
  const [expenseCategory, setExpenseCategory] = useState('Electricity for common areas');
  const [expenseAmount, setExpenseAmount] = useState('8500');
  const [expensePayee, setExpensePayee] = useState('TSSPDCL Electricity Board');
  const [expenseDesc, setExpenseDesc] = useState('Common area street lights & corridor meter bill');
  const [expenseProof, setExpenseProof] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400');
  const [savingExpense, setSavingExpense] = useState(false);

  // Watchman Salary
  const [salaryMonth, setSalaryMonth] = useState('2026-11');
  const [salaryAmount, setSalaryAmount] = useState('26000');
  const [guardUserId, setGuardUserId] = useState('');
  const [salaryRef, setSalaryRef] = useState('NEFT-202611-WATCHMAN');
  const [payingSalary, setPayingSalary] = useState(false);

  // Complaint Linking
  const [complaintClusterId, setComplaintClusterId] = useState('');
  const [linkingComplaint, setLinkingComplaint] = useState(false);

  const handleRecordExpense = async () => {
    if (!expenseCategory || !expenseAmount || !expensePayee) {
      Alert.alert('Required', 'Please fill all expense fields.');
      return;
    }
    if (!expenseProof.trim()) {
      Alert.alert('Mandatory Proof Required', 'An expense cannot be recorded without a photo of the bill or work done.');
      return;
    }

    try {
      setSavingExpense(true);
      await recordExpense({
        category: expenseCategory,
        amountPaise: Math.round(Number(expenseAmount) * 100),
        payee: expensePayee,
        description: expenseDesc,
        proofPhotos: [expenseProof],
      });
      Alert.alert('Expense Recorded', `₹${expenseAmount} recorded under ${expenseCategory} with verified proof.`);
      setExpenseAmount('');
      setExpensePayee('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record expense.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDisburseSalary = async () => {
    if (!salaryMonth || !salaryAmount) {
      Alert.alert('Required', 'Please specify month and salary amount.');
      return;
    }

    try {
      setPayingSalary(true);
      await recordWatchmanSalary({
        guardUserId: guardUserId || '664000000000000000000003', // default guard ID
        month: salaryMonth,
        amountPaise: Math.round(Number(salaryAmount) * 100),
        reference: salaryRef,
        proofPhoto: expenseProof,
      });
      Alert.alert(
        'Salary Disbursed',
        `₹${salaryAmount} watchman salary recorded for ${salaryMonth}. Guard can now view this in their portal.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record salary.');
    } finally {
      setPayingSalary(false);
    }
  };

  const handleLinkComplaint = async () => {
    if (!complaintClusterId.trim()) {
      Alert.alert('Required', 'Please enter Complaint Cluster ID.');
      return;
    }
    try {
      setLinkingComplaint(true);
      await linkComplaintExpense(complaintClusterId.trim());
      Alert.alert('Linked Successfully', 'Complaint repair cost linked to maintenance ledger.');
      setComplaintClusterId('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to link complaint.');
    } finally {
      setLinkingComplaint(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>President Financial Management</Text>
      <Text style={styles.screenSubtitle}>
        Every transaction must be accounted for with mandatory proof photos.
      </Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['EXPENSE', 'SALARY', 'COMPLAINT'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'EXPENSE'
                ? 'Society Expense'
                : tab === 'SALARY'
                ? 'Watchman Salary'
                : 'Link Complaint'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 1. RECORD SOCIETY EXPENSE */}
      {activeTab === 'EXPENSE' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Society Expense</Text>
          <Text style={styles.ruleNotice}>
            Mandatory Rule: At least one photo of the bill or work is required! Expenses cannot be deleted.
          </Text>

          <Text style={styles.label}>Expense Category *</Text>
          <View style={styles.chipRow}>
            {[
              'Electricity for common areas',
              'Water',
              'Lift maintenance contract',
              'Security staff salary',
              'Cleaning staff',
              'Garden and landscaping',
              'Repairs and emergency work',
            ].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, expenseCategory === cat && styles.chipActive]}
                onPress={() => setExpenseCategory(cat)}
              >
                <Text style={[styles.chipText, expenseCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Amount in Rupees (₹) *</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            placeholder="e.g. 5000"
          />

          <Text style={styles.label}>Paid To (Vendor / Staff / Utility) *</Text>
          <TextInput
            style={styles.input}
            value={expensePayee}
            onChangeText={setExpensePayee}
            placeholder="e.g. Otis Lift AMC / Ramu Electrician"
          />

          <Text style={styles.label}>Description of Work</Text>
          <TextInput
            style={styles.input}
            value={expenseDesc}
            onChangeText={setExpenseDesc}
            placeholder="e.g. Motor capacitor replacement"
          />

          <Text style={styles.label}>Bill Photo / Receipt URL (Mandatory) *</Text>
          <TextInput
            style={styles.input}
            value={expenseProof}
            onChangeText={setExpenseProof}
            placeholder="https://... photo url"
          />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRecordExpense}
            disabled={savingExpense}
          >
            {savingExpense ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Save Expense to Ledger</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 2. WATCHMAN SALARY */}
      {activeTab === 'SALARY' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Disburse Security Guard Salary</Text>
          <Text style={styles.ruleNotice}>
            Disbursed from society maintenance funds under 'Security staff salary'. Visible directly to the guard.
          </Text>

          <Text style={styles.label}>Month (YYYY-MM)</Text>
          <TextInput
            style={styles.input}
            value={salaryMonth}
            onChangeText={setSalaryMonth}
            placeholder="2026-11"
          />

          <Text style={styles.label}>Salary Amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={salaryAmount}
            onChangeText={setSalaryAmount}
            placeholder="26000"
          />

          <Text style={styles.label}>Bank Transfer Reference / UTR</Text>
          <TextInput
            style={styles.input}
            value={salaryRef}
            onChangeText={setSalaryRef}
            placeholder="NEFT-12345"
          />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#059669' }]}
            onPress={handleDisburseSalary}
            disabled={payingSalary}
          >
            {payingSalary ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Disburse Salary (₹{salaryAmount})</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 3. LINK MODULE 4 COMPLAINT */}
      {activeTab === 'COMPLAINT' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Link Module 4 Solved Complaint</Text>
          <Text style={styles.ruleNotice}>
            Automatically converts a solved complaint's vendor cost and before/after photos into a transparent ledger expense entry!
          </Text>

          <Text style={styles.label}>Complaint Cluster ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Cluster ID (from Smart Complaints)"
            value={complaintClusterId}
            onChangeText={setComplaintClusterId}
          />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]}
            onPress={handleLinkComplaint}
            disabled={linkingComplaint}
          >
            {linkingComplaint ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Auto-Link Complaint Expense</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  screenSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#1E3A8A' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  ruleNotice: {
    fontSize: 12,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 16,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#1E40AF' },
  actionBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
