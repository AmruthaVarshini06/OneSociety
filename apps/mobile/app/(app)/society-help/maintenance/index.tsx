import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getMaintenanceAccounts,
  raiseExpenseQuery,
  getExpenseQueries,
  type MaintenanceAccountsDto,
} from '../../../../src/services/society-help';
import { useRouter, useFocusEffect } from 'expo-router';

export default function MaintenanceAccountsScreen() {
  const router = useRouter();
  const [data, setData] = useState<MaintenanceAccountsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  const [proofModalPhoto, setProofModalPhoto] = useState<string | null>(null);

  const [queryModalEntry, setQueryModalEntry] = useState<any | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [existingQueries, setExistingQueries] = useState<any[]>([]);
  const [submittingQuery, setSubmittingQuery] = useState(false);

  const loadData = async () => {
    try {
      const res = await getMaintenanceAccounts();
      setData(res.data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleOpenQueries = async (entry: any) => {
    setQueryModalEntry(entry);
    setQuestionText('');
    try {
      const res = await getExpenseQueries(entry._id);
      setExistingQueries(res.data || []);
    } catch {
      setExistingQueries([]);
    }
  };

  const handleSendQuery = async () => {
    if (!questionText.trim() || !queryModalEntry) return;
    try {
      setSubmittingQuery(true);
      await raiseExpenseQuery(queryModalEntry._id, questionText.trim());
      Alert.alert('Query Posted', 'Your question has been posted to the society president.');
      const res = await getExpenseQueries(queryModalEntry._id);
      setExistingQueries(res.data || []);
      setQuestionText('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to post query.');
    } finally {
      setSubmittingQuery(false);
    }
  };

  const balanceRs = Math.round((data?.currentBalancePaise || 0) / 100);
  const incomeRs = Math.round((data?.totalIncomePaise || 0) / 100);
  const expenseRs = Math.round((data?.totalExpensePaise || 0) / 100);

  const filteredEntries = (data?.entries || []).filter((e) => {
    if (filterType === 'ALL') return true;
    return e.entryType === filterType;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        />
      }
    >
      {}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOTAL SOCIETY FUND BALANCE</Text>
        <Text style={styles.balanceAmount}>₹{balanceRs.toLocaleString('en-IN')}</Text>

        <View style={styles.cashFlowRow}>
          <View style={styles.cashFlowBox}>
            <MaterialCommunityIcons name="arrow-bottom-left" size={16} color="#16A34A" />
            <Text style={styles.cashFlowText}>Total Income: ₹{incomeRs.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.cashFlowBox}>
            <MaterialCommunityIcons name="arrow-top-right" size={16} color="#DC2626" />
            <Text style={styles.cashFlowText}>Total Spent: ₹{expenseRs.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payDuesShortcut}
          onPress={() => router.push('/(app)/society-help/maintenance/pay')}
        >
          <MaterialCommunityIcons name="credit-card-check" size={18} color="#FFFFFF" />
          <Text style={styles.payDuesShortcutText}>Pay My Flat Maintenance Due</Text>
        </TouchableOpacity>
      </View>

      {}
      {data?.efficiencyIndicators ? (
        <View style={styles.indicatorsGrid}>
          <View style={styles.indicatorCard}>
            <Text style={styles.indVal}>{data.efficiencyIndicators.proofSharePercent}%</Text>
            <Text style={styles.indTitle}>Proof Share</Text>
            <Text style={styles.indSub}>Expenses with verified bills</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indVal}>{data.efficiencyIndicators.collectionRatePercent}%</Text>
            <Text style={styles.indTitle}>Collection Rate</Text>
            <Text style={styles.indSub}>Dues paid on time</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indVal}>{data.efficiencyIndicators.monthsBalanceRemaining} mo</Text>
            <Text style={styles.indTitle}>Burn Runway</Text>
            <Text style={styles.indSub}>Fund runway at avg burn</Text>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indVal}>{data.efficiencyIndicators.complaintLinkedSharePercent}%</Text>
            <Text style={styles.indTitle}>Complaint Linked</Text>
            <Text style={styles.indSub}>Direct issue fixes</Text>
          </View>
        </View>
      ) : null}

      {}
      {data?.monthlyChartData && data.monthlyChartData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Income vs Expense</Text>
          <View style={styles.chartRow}>
            {data.monthlyChartData.map((m) => {
              const maxVal = Math.max(m.incomeRs, m.expenseRs, 10000);
              const incHeight = Math.max(12, (m.incomeRs / maxVal) * 70);
              const expHeight = Math.max(12, (m.expenseRs / maxVal) * 70);
              return (
                <View key={m.month} style={styles.barGroup}>
                  <View style={styles.barsContainer}>
                    <View style={[styles.bar, styles.barIncome, { height: incHeight }]} />
                    <View style={[styles.bar, styles.barExpense, { height: expHeight }]} />
                  </View>
                  <Text style={styles.barLabel}>{m.month.slice(5)}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Expense</Text>
            </View>
          </View>
        </View>
      ) : null}

      {}
      {data?.categorySpending && data.categorySpending.length > 0 ? (
        <View style={styles.categoryCard}>
          <Text style={styles.chartTitle}>Category Spending vs Budget</Text>
          {data.categorySpending.map((cat) => (
            <View key={cat.category} style={styles.catRow}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>{cat.category}</Text>
                <Text style={styles.catAmount}>₹{cat.amountRs.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(100, cat.sharePercent)}%`,
                      backgroundColor: cat.amountRs > cat.budgetRs && cat.budgetRs > 0 ? '#DC2626' : '#1E3A8A',
                    },
                  ]}
                />
              </View>
              <Text style={styles.catMeta}>
                {cat.sharePercent}% of total expenses • Budget: ₹{cat.budgetRs.toLocaleString('en-IN')}/mo
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {}
      <View style={styles.ledgerHeader}>
        <Text style={styles.chartTitle}>Transparent Transaction Ledger</Text>
        <View style={styles.filterTabs}>
          {(['ALL', 'EXPENSE', 'INCOME'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.fTab, filterType === tab && styles.fTabActive]}
              onPress={() => setFilterType(tab)}
            >
              <Text style={[styles.fTabText, filterType === tab && styles.fTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
      ) : (
        filteredEntries.map((entry) => {
          const isIncome = entry.entryType === 'INCOME';
          return (
            <View key={entry._id} style={styles.txnCard}>
              <View style={styles.txnHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnCategory}>{entry.category}</Text>
                  <Text style={styles.txnDesc}>{entry.description}</Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    isIncome ? { color: '#16A34A' } : { color: '#DC2626' },
                  ]}
                >
                  {isIncome ? '+' : '-'}₹{(entry.amountPaise / 100).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.txnMetaRow}>
                <Text style={styles.txnMeta}>
                  {entry.entryNumber} • {new Date(entry.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {entry.paymentMode}
                </Text>
                <Text style={styles.txnPayee}>{entry.payeeOrPayer}</Text>
              </View>

              {}
              {entry.linkedComplaintNumber ? (
                <View style={styles.complaintLinkedBox}>
                  <MaterialCommunityIcons name="link-variant" size={14} color="#1E40AF" />
                  <Text style={styles.complaintLinkedText}>
                    Linked Issue #{entry.linkedComplaintNumber} (Verified fix)
                  </Text>
                </View>
              ) : null}

              {}
              <View style={styles.txnActionRow}>
                {entry.proofPhotos && entry.proofPhotos.length > 0 ? (
                  <TouchableOpacity
                    style={styles.proofBtn}
                    onPress={() => setProofModalPhoto(entry.proofPhotos[0])}
                  >
                    <MaterialCommunityIcons name="file-check" size={16} color="#16A34A" />
                    <Text style={styles.proofBtnText}>View Bill / Work Proof</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noProofText}>No receipt photo</Text>
                )}

                {!isIncome ? (
                  <TouchableOpacity
                    style={styles.queryBtn}
                    onPress={() => handleOpenQueries(entry)}
                  >
                    <MaterialCommunityIcons name="comment-question-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.queryBtnText}>Questions</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      {}
      <Modal visible={!!proofModalPhoto} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Verified Expense Proof</Text>
              <TouchableOpacity onPress={() => setProofModalPhoto(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {proofModalPhoto ? (
              <Image source={{ uri: proofModalPhoto }} style={styles.fullProofImg} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={!!queryModalEntry} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.queryModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Resident Expense Query</Text>
              <TouchableOpacity onPress={() => setQueryModalEntry(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {queryModalEntry ? (
              <ScrollView>
                <Text style={styles.queryEntryName}>
                  {queryModalEntry.category}: {queryModalEntry.description} (₹
                  {(queryModalEntry.amountPaise / 100).toLocaleString('en-IN')})
                </Text>

                {}
                {existingQueries.map((q) => (
                  <View key={q._id} style={styles.qaCard}>
                    <Text style={styles.qText}>❓ {q.question}</Text>
                    {q.answer ? (
                      <View style={styles.answerBox}>
                        <Text style={styles.aText}>🛡️ President Reply: {q.answer}</Text>
                      </View>
                    ) : (
                      <Text style={styles.pendingAnswer}>Awaiting reply from president...</Text>
                    )}
                  </View>
                ))}

                {}
                <Text style={styles.askLabel}>Ask a question about this expense:</Text>
                <TextInput
                  style={styles.queryInput}
                  placeholder="e.g. Which vendor did the repairs? Was warranty provided?"
                  value={questionText}
                  onChangeText={setQuestionText}
                  multiline
                />

                <TouchableOpacity
                  style={styles.sendQueryBtn}
                  onPress={handleSendQuery}
                  disabled={submittingQuery}
                >
                  {submittingQuery ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendQueryBtnText}>Post Question to President</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  balanceCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: '#93C5FD', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  cashFlowRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cashFlowBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 8,
    borderRadius: 8,
  },
  cashFlowText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  payDuesShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  payDuesShortcutText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  indicatorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  indicatorCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  indVal: { fontSize: 20, fontWeight: '900', color: '#1E3A8A' },
  indTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  indSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    marginVertical: 12,
  },
  barGroup: { alignItems: 'center', gap: 4 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 12, borderRadius: 3 },
  barIncome: { backgroundColor: '#16A34A' },
  barExpense: { backgroundColor: '#DC2626' },
  barLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#475569' },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  catRow: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  catAmount: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, borderRadius: 4 },
  catMeta: { fontSize: 11, color: '#64748B', marginTop: 3 },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTabs: { flexDirection: 'row', gap: 6 },
  fTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E2E8F0' },
  fTabActive: { backgroundColor: '#1E3A8A' },
  fTabText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  fTabTextActive: { color: '#FFFFFF' },
  txnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  txnCategory: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  txnDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '900' },
  txnMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  txnMeta: { fontSize: 11, color: '#94A3B8' },
  txnPayee: { fontSize: 11, fontWeight: '700', color: '#475569' },
  complaintLinkedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  complaintLinkedText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },
  txnActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  proofBtnText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  noProofText: { fontSize: 11, color: '#94A3B8' },
  queryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  queryBtnText: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  photoModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center' },
  photoModalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  photoModalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  fullProofImg: { width: '100%', height: 320, borderRadius: 12 },
  queryModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, maxHeight: '85%' },
  queryEntryName: { fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 12 },
  qaCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 8 },
  qText: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  answerBox: { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 6, marginTop: 6 },
  aText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },
  pendingAnswer: { fontSize: 11, color: '#D97706', marginTop: 4, fontStyle: 'italic' },
  askLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 6 },
  queryInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    height: 70,
    textAlignVertical: 'top',
  },
  sendQueryBtn: { backgroundColor: '#1E3A8A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  sendQueryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
