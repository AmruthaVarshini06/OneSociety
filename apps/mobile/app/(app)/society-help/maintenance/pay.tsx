import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getMaintenanceDues,
  payMaintenanceDue,
  type MaintenanceDueDto,
} from '../../../../src/services/society-help';
import { useRouter } from 'expo-router';

export default function PayMaintenanceScreen() {
  const router = useRouter();
  const [dues, setDues] = useState<MaintenanceDueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadDues = async () => {
    try {
      const res = await getMaintenanceDues();
      setDues(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDues();
  }, []);

  const handlePayInApp = async (due: MaintenanceDueDto) => {
    try {
      setPayingId(due._id);
      const res = await payMaintenanceDue(due._id);
      const receipt = res.data.receiptNumber;
      Alert.alert(
        'Payment Successful! 🎉',
        `Maintenance fee of ₹${due.amountPaise / 100} for ${due.billingMonth} paid successfully!\n\nReceipt #${receipt}`
      );
      loadDues();
    } catch (err: any) {
      Alert.alert('Payment Failed', err.response?.data?.error || 'Payment gateway error.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Flat Maintenance Dues</Text>
      <Text style={styles.subtitle}>
        Pay monthly maintenance dues (₹2,500) online. Digital receipts are stored permanently.
      </Text>

      {loading ? (
        <ActivityIndicator color="#1E3A8A" style={{ marginTop: 40 }} />
      ) : dues.length > 0 ? (
        dues.map((due) => {
          const isPaid = due.status === 'PAID';
          const isPaying = payingId === due._id;
          return (
            <View key={due._id} style={[styles.card, isPaid ? styles.cardPaid : styles.cardDue]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.monthTitle}>{due.billingMonth}</Text>
                  <Text style={styles.flatCode}>Flat {due.flatCode}</Text>
                </View>
                <View style={[styles.statusBadge, isPaid ? styles.badgePaid : styles.badgeDue]}>
                  <Text style={[styles.statusText, isPaid ? { color: '#15803D' } : { color: '#991B1B' }]}>
                    {due.status}
                  </Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Total Due:</Text>
                <Text style={styles.amountVal}>₹{(due.amountPaise / 100).toLocaleString('en-IN')}</Text>
              </View>

              {isPaid ? (
                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Receipt Number:</Text>
                    <Text style={styles.receiptVal}>{due.receiptNumber}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Paid At:</Text>
                    <Text style={styles.receiptVal}>
                      {due.paidAt ? new Date(due.paidAt).toLocaleDateString() : 'Paid'} ({due.paymentMode})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadReceiptBtn}
                    onPress={() => Alert.alert('Receipt Downloaded', `Receipt #${due.receiptNumber} saved.`)}
                  >
                    <MaterialCommunityIcons name="receipt" size={16} color="#1E3A8A" />
                    <Text style={styles.downloadReceiptText}>View Official Receipt</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => handlePayInApp(due)}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="shield-check" size={18} color="#FFFFFF" />
                      <Text style={styles.payBtnText}>
                        Pay ₹{(due.amountPaise / 100).toLocaleString('en-IN')} (UPI / Cards)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="check-all" size={48} color="#16A34A" />
          <Text style={styles.emptyText}>All dues are clear! No pending payments.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  cardDue: { borderColor: '#FDE68A' },
  cardPaid: { borderColor: '#BBF7D0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  flatCode: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeDue: { backgroundColor: '#FEF3C7' },
  badgePaid: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 12, fontWeight: '800' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  amountLabel: { fontSize: 14, color: '#475569' },
  amountVal: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  receiptBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  receiptLabel: { fontSize: 12, color: '#64748B' },
  receiptVal: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  downloadReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  downloadReceiptText: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#15803D' },
});
