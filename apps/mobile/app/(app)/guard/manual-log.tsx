import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logManualVisitor, searchFlatPresence } from '../../../src/services/society-help';
import { useRouter } from 'expo-router';

export default function GuardManualLogScreen() {
  const router = useRouter();
  const [visitorType, setVisitorType] = useState<'VISITOR' | 'DELIVERY'>('VISITOR');
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [flatCode, setFlatCode] = useState('');
  const [purpose, setPurpose] = useState('');
  const [deliveryCompany, setDeliveryCompany] = useState('Amazon');
  const [peopleCount, setPeopleCount] = useState(1);
  const [acceptedParcelAtGate, setAcceptedParcelAtGate] = useState(false);
  const [notes, setNotes] = useState('');

  // Flat presence checking
  const [checkingPresence, setCheckingPresence] = useState(false);
  const [flatStatus, setFlatStatus] = useState<'PRESENT' | 'NOT_PRESENT' | null>(null);
  const [presenceAlert, setPresenceAlert] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // Check presence when flatCode changes (debounced or on blur)
  const checkFlat = async (val: string) => {
    const code = val.trim().toUpperCase();
    if (!code) {
      setFlatStatus(null);
      setPresenceAlert(null);
      return;
    }
    try {
      setCheckingPresence(true);
      const res = await searchFlatPresence(code);
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        setFlatStatus(item.status || 'PRESENT');
        if (item.status === 'NOT_PRESENT') {
          setPresenceAlert(`⚠️ NOBODY AT HOME in Flat ${code} since ${item.lastUpdated || 'recently'}`);
          if (visitorType === 'DELIVERY') {
            setAcceptedParcelAtGate(true); // suggest gate drop
          }
        } else {
          setPresenceAlert(null);
        }
      } else {
        setFlatStatus(null);
        setPresenceAlert(null);
      }
    } catch {
      // ignore
    } finally {
      setCheckingPresence(false);
    }
  };

  const handleSave = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Required', 'Please enter visitor or delivery agent name.');
      return;
    }
    if (!flatCode.trim()) {
      Alert.alert('Required', 'Please enter flat number.');
      return;
    }

    // Check nobody at home rule
    if (flatStatus === 'NOT_PRESENT') {
      if (visitorType === 'VISITOR') {
        Alert.alert(
          'Entry Denied',
          `Nobody is at home in Flat ${flatCode}. Visitors are strictly not permitted when resident is away!`
        );
        return;
      } else if (visitorType === 'DELIVERY' && !acceptedParcelAtGate) {
        Alert.alert(
          'Action Required',
          `Resident is away from Flat ${flatCode}. Delivery agent cannot go up. Please toggle "Accept Parcel at Gate" to receive the parcel on behalf of resident.`
        );
        return;
      }
    }

    try {
      setSaving(true);
      const res = await logManualVisitor({
        visitorType,
        visitorName: visitorName.trim(),
        phone: phone.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        flatCode: flatCode.trim().toUpperCase(),
        purpose: visitorType === 'DELIVERY' ? `Delivery: ${deliveryCompany}` : purpose || 'Personal Visit',
        deliveryCompany: visitorType === 'DELIVERY' ? deliveryCompany : undefined,
        peopleCount,
        acceptedParcelAtGate,
        notes: notes.trim() || undefined,
      });

      const entry = res.data;
      if (entry.status === 'DENIED') {
        Alert.alert('Entry Denied', entry.deniedReason || 'Entry not allowed.');
      } else {
        Alert.alert(
          'Visitor Logged',
          `${visitorName} logged successfully for Flat ${flatCode}. Added to Currently Inside.`
        );
        router.push('/(app)/guard/currently-inside');
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.response?.data?.error || 'Failed to log visitor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Gate Visitor Notepad</Text>
      <Text style={styles.screenSubtitle}>
        Manual entry for visitors and delivery agents. Current in-time auto-stamped.
      </Text>

      {/* Visitor / Delivery Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, visitorType === 'VISITOR' && styles.toggleBtnActive]}
          onPress={() => {
            setVisitorType('VISITOR');
            setAcceptedParcelAtGate(false);
          }}
        >
          <MaterialCommunityIcons
            name="account"
            size={20}
            color={visitorType === 'VISITOR' ? '#FFFFFF' : '#475569'}
          />
          <Text
            style={[
              styles.toggleBtnText,
              visitorType === 'VISITOR' && styles.toggleBtnTextActive,
            ]}
          >
            Visitor / Guest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, visitorType === 'DELIVERY' && styles.toggleBtnActive]}
          onPress={() => {
            setVisitorType('DELIVERY');
            if (flatStatus === 'NOT_PRESENT') setAcceptedParcelAtGate(true);
          }}
        >
          <MaterialCommunityIcons
            name="moped"
            size={20}
            color={visitorType === 'DELIVERY' ? '#FFFFFF' : '#475569'}
          />
          <Text
            style={[
              styles.toggleBtnText,
              visitorType === 'DELIVERY' && styles.toggleBtnTextActive,
            ]}
          >
            Delivery Agent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Companies Quick Selector */}
      {visitorType === 'DELIVERY' ? (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Delivery Company</Text>
          <View style={styles.chipRow}>
            {['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Blinkit', 'Courier / Other'].map(
              (co) => (
                <TouchableOpacity
                  key={co}
                  style={[
                    styles.chip,
                    deliveryCompany === co && styles.chipActive,
                  ]}
                  onPress={() => setDeliveryCompany(co)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      deliveryCompany === co && styles.chipTextActive,
                    ]}
                  >
                    {co}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      ) : null}

      {/* Visitor Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {visitorType === 'DELIVERY' ? 'Delivery Agent Name *' : 'Visitor Name *'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ramesh Kumar"
          value={visitorName}
          onChangeText={setVisitorName}
        />
      </View>

      {/* Flat Code + Presence Check */}
      <View style={styles.formGroup}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.label}>Visiting Flat Number *</Text>
          {checkingPresence ? (
            <ActivityIndicator size="small" color="#1E3A8A" />
          ) : flatStatus ? (
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: flatStatus === 'PRESENT' ? '#16A34A' : '#DC2626',
              }}
            >
              {flatStatus === 'PRESENT' ? '● Someone At Home' : '● NOBODY AT HOME'}
            </Text>
          ) : null}
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g. A-101, B-202"
          value={flatCode}
          onChangeText={(v) => {
            setFlatCode(v);
            if (v.length >= 3) checkFlat(v);
          }}
          onBlur={() => checkFlat(flatCode)}
          autoCapitalize="characters"
        />
      </View>

      {/* Presence Alert Warning */}
      {presenceAlert ? (
        <View style={styles.presenceBox}>
          <MaterialCommunityIcons name="alert-octagon" size={24} color="#DC2626" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.presenceTitle}>NOBODY IS AT HOME!</Text>
            <Text style={styles.presenceDesc}>
              {visitorType === 'VISITOR'
                ? 'Entry cannot be permitted. The resident has marked nobody is at home.'
                : 'Delivery agent CANNOT go up to the flat. Accept parcel at gate instead.'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Accepted Parcel at Gate Toggle for Delivery */}
      {visitorType === 'DELIVERY' ? (
        <TouchableOpacity
          style={[
            styles.gateDropCard,
            acceptedParcelAtGate && styles.gateDropCardActive,
          ]}
          onPress={() => setAcceptedParcelAtGate(!acceptedParcelAtGate)}
        >
          <MaterialCommunityIcons
            name={acceptedParcelAtGate ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={acceptedParcelAtGate ? '#1E3A8A' : '#64748B'}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.gateDropTitle}>Accept Parcel at Gate</Text>
            <Text style={styles.gateDropSubtitle}>
              Keep package securely at security desk. Delivery agent will NOT enter society.
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Phone & Vehicle Number */}
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Vehicle Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AP09AB1234"
            autoCapitalize="characters"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />
        </View>
      </View>

      {/* Purpose for Visitor */}
      {visitorType === 'VISITOR' ? (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Purpose of Visit</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Family visit, dinner, repair"
            value={purpose}
            onChangeText={setPurpose}
          />
        </View>
      ) : null}

      {/* Number of People */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Number of People</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setPeopleCount((p) => Math.max(1, p - 1))}
          >
            <MaterialCommunityIcons name="minus" size={22} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.counterText}>{peopleCount}</Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setPeopleCount((p) => p + 1)}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#1E3A8A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Guard Notes (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Any observation..."
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          flatStatus === 'NOT_PRESENT' && visitorType === 'VISITOR' && { backgroundColor: '#DC2626' },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>
            {flatStatus === 'NOT_PRESENT' && visitorType === 'VISITOR'
              ? 'Block Entry (Nobody Home)'
              : acceptedParcelAtGate
              ? 'Log Gate Parcel (Agent Stays at Gate)'
              : `Allow Entry (${peopleCount} Person${peopleCount > 1 ? 's' : ''})`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  screenSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  toggleBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  toggleBtnTextActive: { color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#1E40AF' },
  formGroup: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  presenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  presenceTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  presenceDesc: { fontSize: 12, color: '#7F1D1D', marginTop: 2 },
  gateDropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 14,
  },
  gateDropCardActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  gateDropTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  gateDropSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  counterText: { fontSize: 20, fontWeight: '800', color: '#1E3A8A' },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
