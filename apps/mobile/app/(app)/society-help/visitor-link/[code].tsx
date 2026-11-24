import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getVisitorPassByCode, type QrPassDto } from '../../../../src/services/society-help';
import { QrCodeDisplay } from '../../../../src/components/QrCodeDisplay';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VisitorPassLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [pass, setPass] = useState<QrPassDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      getVisitorPassByCode(code)
        .then((res) => setPass(res.data))
        .catch((err) => setError(err.response?.data?.error || 'Pass not found or link expired.'))
        .finally(() => setLoading(false));
    }
  }, [code]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading Visitor Pass...</Text>
      </View>
    );
  }

  if (error || !pass) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#DC2626" />
        <Text style={styles.errorTitle}>Invalid or Expired Pass</Text>
        <Text style={styles.errorDesc}>{error || 'This pass could not be retrieved.'}</Text>
      </View>
    );
  }

  const isExpired = new Date(pass.validUntil) < new Date();
  const isValid = pass.status === 'ACTIVE' && !isExpired;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.societyName}>OneSociety Gate Pass</Text>
        <Text style={styles.headerSub}>Authorized Visitor Digital Access</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isValid ? styles.badgeValid : styles.badgeInvalid]}>
            <Text style={[styles.badgeText, isValid ? { color: '#15803D' } : { color: '#991B1B' }]}>
              {isValid ? 'VALID PASS' : pass.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED'}
            </Text>
          </View>
          <Text style={styles.passType}>{pass.passType.replace('_', ' ')}</Text>
        </View>

        <Text style={styles.visitorName}>{pass.visitorName || pass.ownerName}</Text>
        <Text style={styles.visitingFlat}>Visiting Flat {pass.flatCode}</Text>

        <QrCodeDisplay
          code={pass.passCode}
          size={200}
          sublabel="Show this QR code or code text to the security guard at the gate"
        />

        <View style={styles.detailsTable}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Purpose</Text>
            <Text style={styles.tableVal}>{pass.purpose || 'Visit'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>People Allowed</Text>
            <Text style={styles.tableVal}>{pass.expectedPeople} Person(s)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Valid Till</Text>
            <Text style={styles.tableVal}>
              {new Date(pass.validUntil).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.instructionBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#1E3A8A" />
          <Text style={styles.instructionText}>
            The security guard will scan this pass and log entry into the society. Entry is only
            permitted during valid hours.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 12 },
  errorDesc: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' },
  header: { alignItems: 'center', marginVertical: 12 },
  societyName: { fontSize: 22, fontWeight: '900', color: '#1E3A8A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeValid: { backgroundColor: '#DCFCE7' },
  badgeInvalid: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  passType: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  visitorName: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 12 },
  visitingFlat: { fontSize: 15, fontWeight: '700', color: '#1E40AF', marginTop: 2 },
  detailsTable: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableLabel: { fontSize: 13, color: '#64748B' },
  tableVal: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  instructionText: { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 16 },
});
