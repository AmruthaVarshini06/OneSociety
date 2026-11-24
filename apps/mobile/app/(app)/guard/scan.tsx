import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scanPass, confirmScan } from '../../../src/services/society-help';

export default function GuardScanScreen() {
  const [passCodeInput, setPassCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Pop-up form states
  const [direction, setDirection] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [count, setCount] = useState(1);
  const [guardNotes, setGuardNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmationSummary, setConfirmationSummary] = useState<string | null>(null);

  const handleScan = async (codeToVerify?: string) => {
    const code = (codeToVerify || passCodeInput).trim().toUpperCase();
    if (!code) {
      Alert.alert('Required', 'Please enter or scan a pass code');
      return;
    }

    try {
      setLoading(true);
      setConfirmationSummary(null);
      const res = await scanPass(code);
      const data = res.data;
      setScanResult(data);

      // Pre-select direction smartly
      setDirection(data.suggestedDirection || 'ENTRY');
      setCount(1);
      setGuardNotes('');
      setModalVisible(true);
    } catch (err: any) {
      Alert.alert(
        'Scan Error',
        err.response?.data?.error || 'Invalid QR pass code or pass not found.'
      );
    } finally {
      setLoading(false);
    }
  };

  const incrementCount = () => {
    if (direction === 'EXIT') {
      const inside = scanResult?.pass?.peopleCurrentlyInside || 0;
      if (count >= inside) {
        Alert.alert('Limit Reached', `Only ${inside} person(s) currently recorded inside on this pass.`);
        return;
      }
    }
    setCount((prev) => prev + 1);
  };

  const decrementCount = () => {
    if (count > 1) {
      setCount((prev) => prev - 1);
    }
  };

  const handleConfirm = async () => {
    if (!scanResult) return;

    if (direction === 'EXIT') {
      const inside = scanResult.pass.peopleCurrentlyInside || 0;
      if (count > inside) {
        Alert.alert('Error', `Exit count (${count}) cannot be greater than people inside (${inside}).`);
        return;
      }
    }

    // Nobody at home check
    if (
      direction === 'ENTRY' &&
      scanResult.pass.passType === 'VISITOR' &&
      scanResult.flatPresence &&
      !scanResult.flatPresence.isAtHome
    ) {
      Alert.alert(
        'Entry Blocked',
        'Nobody is at home in this flat. Society rule prohibits visitor entry when flat is empty.'
      );
      return;
    }

    try {
      setConfirming(true);
      const res = await confirmScan({
        passId: scanResult.pass._id,
        direction,
        count,
        notes: guardNotes,
      });

      setModalVisible(false);
      setPassCodeInput('');
      const p = res.data.pass;
      const summary = `${p.peopleEnteredTotal} entered, ${p.peopleExitedTotal} exited, ${p.peopleCurrentlyInside} currently inside.`;
      setConfirmationSummary(`Scan Confirmed! (${direction} of ${count}): ${summary}`);
      Alert.alert('Scan Confirmed', summary);
    } catch (err: any) {
      Alert.alert('Confirmation Failed', err.response?.data?.error || 'Failed to record entry/exit.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Search Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual Pass Entry / Camera Scan</Text>
        <Text style={styles.cardSubtitle}>
          Enter pass code (e.g. PASS-0001-A9F2) or select quick demo pass
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="PASS-XXXX-XXXX"
            value={passCodeInput}
            onChangeText={setPassCodeInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => handleScan()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.scanBtnText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Passes */}
        <Text style={styles.quickLabel}>Demo Quick Test Passes:</Text>
        <View style={styles.quickWrap}>
          {[
            { label: 'Family (A-101)', code: 'PASS-0001' },
            { label: 'Visitor (B-201)', code: 'PASS-VIS-01' },
            { label: 'Maid (Lakshmi)', code: 'PASS-PROV-01' },
            { label: 'Guest Pass', code: 'PASS-GUEST-01' },
          ].map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.quickPill}
              onPress={() => {
                setPassCodeInput(item.code);
                handleScan(item.code);
              }}
            >
              <Text style={styles.quickPillText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Confirmation Banner */}
      {confirmationSummary ? (
        <View style={styles.successBox}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#16A34A" />
          <Text style={styles.successText}>{confirmationSummary}</Text>
        </View>
      ) : null}

      {/* Verification Pop-Up Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {scanResult ? (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Pass Verification</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Pass Details Card */}
                <View style={styles.passDetailsCard}>
                  <View style={styles.passHeaderRow}>
                    <View style={styles.avatar}>
                      {scanResult.pass.servicePhotoUrl ? (
                        <Image
                          source={{ uri: scanResult.pass.servicePhotoUrl }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={
                            scanResult.pass.passType === 'FAMILY'
                              ? 'home-account'
                              : scanResult.pass.passType === 'SERVICE_PROVIDER'
                              ? 'hammer-wrench'
                              : 'account'
                          }
                          size={28}
                          color="#1E3A8A"
                        />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.passName}>
                        {scanResult.pass.visitorName || scanResult.pass.ownerName}
                      </Text>
                      <Text style={styles.passTypeBadge}>
                        {scanResult.pass.passType.replace('_', ' ')}
                      </Text>
                      {scanResult.pass.flatCode ? (
                        <Text style={styles.flatText}>Flat: {scanResult.pass.flatCode}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Provider ServiceHub Schedule Info */}
                  {scanResult.serviceHubDetails ? (
                    <View style={styles.providerInfoBox}>
                      <Text style={styles.providerInfoTitle}>
                        🛠️ ServiceHub Verified Provider
                      </Text>
                      <Text style={styles.providerInfoText}>
                        Category: {scanResult.serviceHubDetails.category}
                      </Text>
                      <Text style={styles.providerInfoText}>
                        Scheduled: Flat {scanResult.serviceHubDetails.scheduledFlat} (
                        {scanResult.serviceHubDetails.timeSlot})
                      </Text>
                    </View>
                  ) : null}

                  {/* Presence Alert for Visitors */}
                  {scanResult.flatPresence && !scanResult.flatPresence.isAtHome ? (
                    <View style={styles.redAlertBox}>
                      <MaterialCommunityIcons name="alert-octagon" size={22} color="#DC2626" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.redAlertTitle}>NOBODY AT HOME</Text>
                        <Text style={styles.redAlertDesc}>
                          Resident marked flat empty at {scanResult.flatPresence.lastUpdated}.
                          Visitor entry cannot be allowed!
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Stats Counter */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>{scanResult.pass.peopleEnteredTotal}</Text>
                      <Text style={styles.statLabel}>Entered</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>{scanResult.pass.peopleExitedTotal}</Text>
                      <Text style={styles.statLabel}>Exited</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.statNum, { color: '#1E3A8A' }]}>
                        {scanResult.pass.peopleCurrentlyInside}
                      </Text>
                      <Text style={styles.statLabel}>Inside</Text>
                    </View>
                  </View>
                </View>

                {/* Direction Selector */}
                <Text style={styles.sectionHeader}>Select Direction</Text>
                <View style={styles.directionToggle}>
                  <TouchableOpacity
                    style={[
                      styles.dirBtn,
                      direction === 'ENTRY' && styles.dirBtnActiveEntry,
                    ]}
                    onPress={() => {
                      setDirection('ENTRY');
                      setCount(1);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-right-bold-circle"
                      size={20}
                      color={direction === 'ENTRY' ? '#FFFFFF' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.dirBtnText,
                        direction === 'ENTRY' && styles.dirBtnTextActive,
                      ]}
                    >
                      ENTRY
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dirBtn,
                      direction === 'EXIT' && styles.dirBtnActiveExit,
                    ]}
                    onPress={() => {
                      setDirection('EXIT');
                      setCount(1);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left-bold-circle"
                      size={20}
                      color={direction === 'EXIT' ? '#FFFFFF' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.dirBtnText,
                        direction === 'EXIT' && styles.dirBtnTextActive,
                      ]}
                    >
                      EXIT
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Number Counter */}
                <Text style={styles.sectionHeader}>How many people?</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={decrementCount}
                    disabled={count <= 1}
                  >
                    <MaterialCommunityIcons name="minus" size={24} color="#1E3A8A" />
                  </TouchableOpacity>
                  <Text style={styles.countText}>{count}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={incrementCount}>
                    <MaterialCommunityIcons name="plus" size={24} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
                {direction === 'EXIT' ? (
                  <Text style={styles.hintText}>
                    Max allowed exit: {scanResult.pass.peopleCurrentlyInside} (currently inside)
                  </Text>
                ) : null}

                {/* Guard Notes */}
                <TextInput
                  style={styles.notesInput}
                  placeholder="Guard notes / vehicle number (optional)..."
                  value={guardNotes}
                  onChangeText={setGuardNotes}
                />

                {/* Action Buttons */}
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    direction === 'ENTRY'
                      ? { backgroundColor: '#16A34A' }
                      : { backgroundColor: '#DC2626' },
                  ]}
                  onPress={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      Confirm {direction} ({count} person{count > 1 ? 's' : ''})
                    </Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0F172A',
  },
  scanBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 14, marginBottom: 8 },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickPillText: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
    gap: 8,
  },
  successText: { color: '#15803D', fontWeight: '600', fontSize: 14, flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  passDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  passHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48 },
  passName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  passTypeBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  flatText: { fontSize: 13, color: '#475569', marginTop: 2 },
  providerInfoBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  providerInfoTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  providerInfoText: { fontSize: 12, color: '#78350F', marginTop: 2 },
  redAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  redAlertTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  redAlertDesc: { fontSize: 12, color: '#7F1D1D', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNum: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#334155', marginVertical: 8 },
  directionToggle: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  dirBtnActiveEntry: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  dirBtnActiveExit: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  dirBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  dirBtnTextActive: { color: '#FFFFFF' },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 12,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  countText: { fontSize: 26, fontWeight: '800', color: '#1E3A8A', minWidth: 40, textAlign: 'center' },
  hintText: { fontSize: 12, color: '#DC2626', textAlign: 'center', marginBottom: 10 },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
