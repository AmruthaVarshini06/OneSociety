import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getMyFamilyPass,
  listMyPasses,
  createVisitorPass,
  revokePass,
  type QrPassDto,
} from '../../../src/services/society-help';
import { QrCodeDisplay } from '../../../src/components/QrCodeDisplay';
import { useFocusEffect } from 'expo-router';

export default function PassesScreen() {
  const [familyPass, setFamilyPass] = useState<QrPassDto | null>(null);
  const [myPasses, setMyPasses] = useState<QrPassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedPeople, setExpectedPeople] = useState(1);
  const [validDays, setValidDays] = useState(1);
  const [creating, setCreating] = useState(false);

  const [sharePass, setSharePass] = useState<QrPassDto | null>(null);

  const loadData = async () => {
    try {
      const [famRes, listRes] = await Promise.all([getMyFamilyPass(), listMyPasses()]);
      setFamilyPass(famRes.data);
      setMyPasses((listRes.data || []).filter((p) => p.passType !== 'FAMILY'));
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

  const handleCreatePass = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Required', 'Please enter visitor name.');
      return;
    }

    try {
      setCreating(true);
      const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();
      const res = await createVisitorPass({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        purpose: purpose.trim() || undefined,
        expectedPeople,
        validUntil,
      });

      setCreateModalVisible(false);
      setVisitorName('');
      setVisitorPhone('');
      setPurpose('');
      setExpectedPeople(1);

      setSharePass(res.data);
      loadData();
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.error || 'Could not create visitor pass.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokePass = (pass: QrPassDto) => {
    Alert.alert(
      'Revoke Pass',
      `Are you sure you want to revoke the pass for ${pass.visitorName || pass.ownerName}? Visitors won't be able to enter using this pass.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokePass(pass._id, 'Host cancelled');
              Alert.alert('Revoked', 'Pass has been revoked.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to revoke pass.');
            }
          },
        },
      ]
    );
  };

  const getShareableUrl = (code: string) => `https://onesociety.local/visitor-pass/${code}`;

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
      {familyPass ? (
        <View style={styles.familyCard}>
          <View style={styles.familyHeader}>
            <View>
              <Text style={styles.familyTitle}>Flat {familyPass.flatCode} Family QR Pass</Text>
              <Text style={styles.familySub}>Valid for all members of this flat</Text>
            </View>
            <View style={styles.badgeActive}>
              <Text style={styles.badgeActiveText}>ACTIVE</Text>
            </View>
          </View>

          <QrCodeDisplay
            code={familyPass.passCode}
            size={180}
            sublabel="Scan at society gate when entering or leaving"
          />

          {}
          <View style={styles.counterRow}>
            <View style={styles.countItem}>
              <Text style={styles.countNum}>{familyPass.peopleEnteredTotal}</Text>
              <Text style={styles.countLabel}>Entered</Text>
            </View>
            <View style={styles.countItem}>
              <Text style={styles.countNum}>{familyPass.peopleExitedTotal}</Text>
              <Text style={styles.countLabel}>Exited</Text>
            </View>
            <View style={[styles.countItem, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.countNum, { color: '#1E3A8A' }]}>
                {familyPass.peopleCurrentlyInside}
              </Text>
              <Text style={styles.countLabel}>Inside Society</Text>
            </View>
          </View>
        </View>
      ) : null}

      {}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Visitor Passes</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Visitor Pass</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
      ) : myPasses.length > 0 ? (
        myPasses.map((p) => {
          const isActive = p.status === 'ACTIVE' && new Date(p.validUntil) > new Date();
          return (
            <View key={p._id} style={styles.passCard}>
              <View style={styles.passTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.passName}>{p.visitorName || p.ownerName}</Text>
                  <Text style={styles.passPurpose}>
                    {p.purpose || 'Visit'} • {p.expectedPeople} Person{p.expectedPeople > 1 ? 's' : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    p.status === 'REVOKED'
                      ? styles.pillRevoked
                      : isActive
                      ? styles.pillActive
                      : styles.pillExpired,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      p.status === 'REVOKED'
                        ? { color: '#DC2626' }
                        : isActive
                        ? { color: '#16A34A' }
                        : { color: '#64748B' },
                    ]}
                  >
                    {p.status === 'REVOKED' ? 'REVOKED' : isActive ? 'ACTIVE' : 'EXPIRED'}
                  </Text>
                </View>
              </View>

              {}
              <View style={styles.trackingRow}>
                <Text style={styles.trackText}>
                  Entered: <Text style={styles.bold}>{p.peopleEnteredTotal}</Text> • Exited:{' '}
                  <Text style={styles.bold}>{p.peopleExitedTotal}</Text> • Currently Inside:{' '}
                  <Text style={[styles.bold, { color: p.peopleCurrentlyInside > 0 ? '#16A34A' : '#64748B' }]}>
                    {p.peopleCurrentlyInside}
                  </Text>
                </Text>
                <Text style={styles.validText}>
                  Valid till: {new Date(p.validUntil).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {}
              <View style={styles.passActions}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => setSharePass(p)}
                >
                  <MaterialCommunityIcons name="share-variant" size={16} color="#1E3A8A" />
                  <Text style={styles.shareBtnText}>Share Link / QR</Text>
                </TouchableOpacity>

                {p.status === 'ACTIVE' ? (
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => handleRevokePass(p)}
                  >
                    <MaterialCommunityIcons name="cancel" size={16} color="#DC2626" />
                    <Text style={styles.revokeBtnText}>Revoke</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="account-clock" size={40} color="#94A3B8" />
          <Text style={styles.emptyText}>No visitor passes generated yet</Text>
        </View>
      )}

      {}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Visitor Pass</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Visitor Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={styles.inputLabel}>Visitor Mobile (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
            />

            <Text style={styles.inputLabel}>Purpose of Visit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dinner, Family gathering"
              value={purpose}
              onChangeText={setPurpose}
            />

            <Text style={styles.inputLabel}>Expected Number of People</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity
                style={styles.cBtn}
                onPress={() => setExpectedPeople((p) => Math.max(1, p - 1))}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#1E3A8A" />
              </TouchableOpacity>
              <Text style={styles.cVal}>{expectedPeople}</Text>
              <TouchableOpacity
                style={styles.cBtn}
                onPress={() => setExpectedPeople((p) => p + 1)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#1E3A8A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Validity Duration</Text>
            <View style={styles.chipRow}>
              {[
                { label: '24 Hours (1 Day)', days: 1 },
                { label: '3 Days', days: 3 },
                { label: '7 Days', days: 7 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.days}
                  style={[
                    styles.dayChip,
                    validDays === item.days && styles.dayChipActive,
                  ]}
                  onPress={() => setValidDays(item.days)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      validDays === item.days && styles.dayChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitCreateBtn}
              onPress={handleCreatePass}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitCreateText}>Generate Pass & Share Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={!!sharePass} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.modalTitle}>Share Visitor Pass</Text>
              <TouchableOpacity onPress={() => setSharePass(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {sharePass ? (
              <>
                <Text style={styles.shareSubtitle}>
                  For {sharePass.visitorName} • Valid for {sharePass.expectedPeople} person(s)
                </Text>

                <QrCodeDisplay
                  code={sharePass.passCode}
                  size={160}
                  sublabel="Visitor can show this QR code directly at the security gate"
                />

                <View style={styles.linkBox}>
                  <Text style={styles.linkLabel}>Shareable Pass Link:</Text>
                  <Text style={styles.linkText} numberOfLines={1}>
                    {getShareableUrl(sharePass.passCode)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => {
                    Alert.alert(
                      'Link Copied & Dispatched',
                      `Visitor pass link copied: ${getShareableUrl(sharePass.passCode)}\nSent mock WhatsApp notification to visitor.`
                    );
                    setSharePass(null);
                  }}
                >
                  <MaterialCommunityIcons name="whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.whatsappBtnText}>Send via WhatsApp / Copy Link</Text>
                </TouchableOpacity>
              </>
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
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  familyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  familyTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  familySub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActiveText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
  counterRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  countItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countNum: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  countLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  passName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  passPurpose: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillActive: { backgroundColor: '#DCFCE7' },
  pillExpired: { backgroundColor: '#F1F5F9' },
  pillRevoked: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  trackingRow: { marginTop: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  trackText: { fontSize: 12, color: '#475569' },
  bold: { fontWeight: '700' },
  validText: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  passActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  revokeBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { marginTop: 8, fontSize: 13, color: '#94A3B8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 6 },
  cBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cVal: { fontSize: 18, fontWeight: '800', color: '#1E3A8A' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 14 },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dayChipActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  dayChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  dayChipTextActive: { color: '#1E40AF' },
  submitCreateBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitCreateText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  shareSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 10 },
  linkBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginVertical: 12,
  },
  linkLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  linkText: { fontSize: 13, color: '#1E40AF', fontFamily: 'monospace', marginTop: 2 },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  whatsappBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
