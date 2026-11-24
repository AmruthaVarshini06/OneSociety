import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createCommunityEvent } from '../../../../src/services/society-help';
import { useRouter } from 'expo-router';

export default function NewEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Birthday');
  const [startDateStr, setStartDateStr] = useState('2026-11-28');
  const [endDateStr, setEndDateStr] = useState('2026-11-28');
  const [dailyTimeFrom, setDailyTimeFrom] = useState('11:00');
  const [dailyTimeTo, setDailyTimeTo] = useState('18:00');
  const [estimatedVisitors, setEstimatedVisitors] = useState('25');
  const [expectedVehicles, setExpectedVehicles] = useState('6');
  const [hasLoudSound, setHasLoudSound] = useState(false);
  const [loudSoundType, setLoudSoundType] = useState('Speakers / Music');
  const [loudSoundEndTime, setLoudSoundEndTime] = useState('21:00');
  const [useCommonAreas, setUseCommonAreas] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live Quiet Hours Check: Quiet hours start at 22:00
  const isQuietHoursWarning =
    hasLoudSound &&
    (loudSoundEndTime >= '22:00' || loudSoundEndTime < '06:00' || dailyTimeTo > '22:00');

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter event title.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createCommunityEvent({
        title: title.trim(),
        eventType,
        startDate: new Date(startDateStr).toISOString(),
        endDate: new Date(endDateStr).toISOString(),
        dailyTimeFrom,
        dailyTimeTo,
        estimatedVisitors: Number(estimatedVisitors) || 10,
        expectedVehicles: Number(expectedVehicles) || 0,
        hasLoudSound,
        loudSoundType: hasLoudSound ? loudSoundType : undefined,
        loudSoundEndTime: hasLoudSound ? loudSoundEndTime : undefined,
        useCommonAreas,
        notes: notes.trim() || undefined,
      });

      const event = res.data;
      Alert.alert(
        'Event Announced! 🎉',
        `Guest Pass: ${event.guestPassCode}\n\nGuests can use this single pass code at the gate. The security guard will anticipate ${estimatedVisitors} visitors.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Announce Society Event</Text>
      <Text style={styles.screenSubtitle}>
        Notifies security guard for visitor parking and keeps society informed. Single event guest
        pass will be auto-generated.
      </Text>

      {/* Event Title */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Aarav's 5th Birthday Party"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Event Type */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Event Category</Text>
        <View style={styles.chipRow}>
          {['Birthday', 'Puja', 'Housewarming', 'Engagement / Wedding', 'Other'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, eventType === cat && styles.chipActive]}
              onPress={() => setEventType(cat)}
            >
              <Text style={[styles.chipText, eventType === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={startDateStr}
            onChangeText={(v) => {
              setStartDateStr(v);
              setEndDateStr(v);
            }}
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Hours (From - To)</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={dailyTimeFrom}
              onChangeText={setDailyTimeFrom}
              placeholder="11:00"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={dailyTimeTo}
              onChangeText={setDailyTimeTo}
              placeholder="20:00"
            />
          </View>
        </View>
      </View>

      {/* Estimated Headcount & Vehicles */}
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Estimated Visitors</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={estimatedVisitors}
            onChangeText={setEstimatedVisitors}
            placeholder="25"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Expected Vehicles</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={expectedVehicles}
            onChangeText={setExpectedVehicles}
            placeholder="5"
          />
        </View>
      </View>

      {/* Loud Sound Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Will there be loud music / speakers?</Text>
            <Text style={styles.toggleSub}>Sound permitted until 10:00 PM (Quiet Hours start)</Text>
          </View>
          <Switch
            value={hasLoudSound}
            onValueChange={setHasLoudSound}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={hasLoudSound ? '#1E3A8A' : '#F1F5F9'}
          />
        </View>

        {hasLoudSound ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Music End Time (e.g. 21:30)</Text>
            <TextInput
              style={styles.input}
              value={loudSoundEndTime}
              onChangeText={setLoudSoundEndTime}
              placeholder="21:00"
            />
          </View>
        ) : null}
      </View>

      {/* LIVE Quiet Hours Alert */}
      {isQuietHoursWarning ? (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-octagon" size={24} color="#DC2626" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.warningTitle}>Society Quiet Hours Warning (10 PM - 6 AM)</Text>
            <Text style={styles.warningDesc}>
              Loud sound scheduled past 22:00 (10:00 PM) will be automatically flagged to the
              society president and security guards. Please plan to reduce volume by 10 PM.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Common Areas Check */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Using Clubhouse / Common Areas?</Text>
            <Text style={styles.toggleSub}>e.g. Lawn, terrace, clubhouse hall</Text>
          </View>
          <Switch
            value={useCommonAreas}
            onValueChange={setUseCommonAreas}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={useCommonAreas ? '#1E3A8A' : '#F1F5F9'}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Announce Event & Generate Guest Pass</Text>
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
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  toggleSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  warningTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  warningDesc: { fontSize: 12, color: '#7F1D1D', marginTop: 2, lineHeight: 16 },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
