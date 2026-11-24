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
import { recordHandover, getCurrentlyInside } from '../../../src/services/society-help';
import { useRouter } from 'expo-router';

export default function ShiftHandoverScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [toGuardName, setToGuardName] = useState('');
  const [activeInside, setActiveInside] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentlyInside().then((res: any) => {
      setActiveInside((res.data.totalInsideManual || 0) + (res.data.totalInsidePasses || 0));
    });
  }, []);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      Alert.alert('Required', 'Please add handover notes (e.g. key items, open gates, issues).');
      return;
    }

    try {
      setLoading(true);
      await recordHandover({
        notes: notes.trim(),
      });
      Alert.alert(
        'Handover Completed',
        `Shift handover logged. Carried over ${activeInside} active people inside count.`
      );
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record shift handover.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Guard Shift Handover</Text>
      <Text style={styles.subtitle}>
        Transfer active gate logs and society custody to incoming shift guard.
      </Text>

      {}
      <View style={styles.card}>
        <View style={styles.snapshotRow}>
          <MaterialCommunityIcons name="transfer" size={24} color="#1E3A8A" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.snapshotLabel}>Carried Over Inside Count</Text>
            <Text style={styles.snapshotNum}>{activeInside} Persons Currently Inside</Text>
          </View>
        </View>
      </View>

      {}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Incoming Guard Name (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bahadur Singh"
          value={toGuardName}
          onChangeText={setToGuardName}
        />
      </View>

      {}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Handover Shift Notes *</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Keys handed over, parcel count at desk, pending visitor exits, equipment status..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.btnText}>Submit Shift Handover</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  snapshotRow: { flexDirection: 'row', alignItems: 'center' },
  snapshotLabel: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },
  snapshotNum: { fontSize: 16, fontWeight: '800', color: '#1E3A8A', marginTop: 2 },
  formGroup: { marginBottom: 16 },
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
  btn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
