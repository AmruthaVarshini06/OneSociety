import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, Chip, TextInput } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '../../../../src/services/service-hub-providers';
import { useAuthStore } from '../../../../src/store/auth';

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export default function ProviderAvailabilityScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('18:00');
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      return updateProfile(user.userId, {
        availability: {
          daysOfWeek: selectedDays,
          workingHours: { from: fromTime, to: toTime },
          blockedDates: blockedDates.map((d) => new Date(d)),
        },
      });
    },
    onSuccess: () => {
      Alert.alert('Saved', 'Your working days, hours and blocked dates have been saved.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  const toggleDay = (d: number) => {
    if (selectedDays.includes(d)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((x) => x !== d));
    } else {
      setSelectedDays([...selectedDays, d].sort());
    }
  };

  const addBlockedDate = () => {
    if (!newBlockedDate.trim()) return;
    setBlockedDates([...blockedDates, newBlockedDate.trim()]);
    setNewBlockedDate('');
  };

  const removeBlockedDate = (idx: number) => {
    setBlockedDates(blockedDates.filter((_, i) => i !== idx));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Availability Settings"
          subtitle="Residents cannot book time slots outside your availability"
        />
        <Card.Content style={{ gap: 14 }}>
          {}
          <Text variant="labelMedium" style={styles.label}>Working Days of Week</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const active = selectedDays.includes(d.value);
              return (
                <Chip
                  key={d.value}
                  selected={active}
                  onPress={() => toggleDay(d.value)}
                  style={[styles.dayChip, active && styles.activeChip]}
                >
                  {d.label}
                </Chip>
              );
            })}
          </View>

          {}
          <Text variant="labelMedium" style={styles.label}>Daily Working Hours</Text>
          <View style={styles.row}>
            <TextInput
              label="From (HH:MM)"
              value={fromTime}
              onChangeText={setFromTime}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
            />
            <TextInput
              label="To (HH:MM)"
              value={toTime}
              onChangeText={setToTime}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
            />
          </View>

          {}
          <Text variant="labelMedium" style={styles.label}>Blocked Dates (Holidays / Leave)</Text>
          <View style={styles.row}>
            <TextInput
              label="Date (YYYY-MM-DD)"
              value={newBlockedDate}
              onChangeText={setNewBlockedDate}
              placeholder="2026-12-25"
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
            />
            <Button mode="contained" onPress={addBlockedDate} style={{ justifyContent: 'center' }}>
              Add Date
            </Button>
          </View>

          <View style={styles.blockedList}>
            {blockedDates.map((d, i) => (
              <Chip key={i} onClose={() => removeBlockedDate(i)} style={styles.blockedChip}>
                {d}
              </Chip>
            ))}
            {blockedDates.length === 0 && (
              <Text variant="bodySmall" style={{ color: '#9E9E9E' }}>No blocked leave dates configured.</Text>
            )}
          </View>

          <Button
            mode="contained"
            buttonColor="#1565C0"
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
            style={{ marginTop: 8 }}
          >
            Save Availability
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  label: { fontWeight: '600', color: '#37474F' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { backgroundColor: '#ECEFF1' },
  activeChip: { backgroundColor: '#C8E6C9' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { backgroundColor: '#ffffff' },
  blockedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 32 },
  blockedChip: { backgroundColor: '#FFEBEE' },
});
