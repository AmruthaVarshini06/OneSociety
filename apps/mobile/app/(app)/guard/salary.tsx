import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getGuardSalaryRecords } from '../../../src/services/society-help';
import { useFocusEffect } from 'expo-router';

export default function GuardSalaryScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await getGuardSalaryRecords();
      setRecords(res.data || []);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Salary Disbursements</Text>
        <Text style={styles.subtitle}>
          Paid directly from Society Maintenance Funds by the Society President.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={records}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cash-remove" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No salary disbursements found yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.monthBadge}>
                  <Text style={styles.monthText}>{item.payrollMonth || 'Monthly Salary'}</Text>
                </View>
                <Text style={styles.amountText}>
                  ₹{(item.amountPaise / 100).toLocaleString('en-IN')}
                </Text>
              </View>

              <Text style={styles.descText}>{item.description}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Mode: {item.paymentMode}</Text>
                <Text style={styles.metaLabel}>
                  Date: {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              {item.proofPhotos && item.proofPhotos.length > 0 ? (
                <View style={styles.proofBox}>
                  <Text style={styles.proofTitle}>Transfer Receipt / Proof:</Text>
                  <Image source={{ uri: item.proofPhotos[0] }} style={styles.proofImg} resizeMode="cover" />
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E3A8A', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#BFDBFE', marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 14, color: '#94A3B8' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthText: { fontSize: 13, fontWeight: '800', color: '#1E40AF' },
  amountText: { fontSize: 18, fontWeight: '900', color: '#16A34A' },
  descText: { fontSize: 13, color: '#334155', marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaLabel: { fontSize: 12, color: '#64748B' },
  proofBox: { marginTop: 10 },
  proofTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  proofImg: { width: '100%', height: 120, borderRadius: 8 },
});
