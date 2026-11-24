import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, TextInput, SegmentedButtons, Chip, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { createRequest } from '../../../../src/services/service-hub-requests';
import { useAuthStore } from '../../../../src/store/auth';

const DAYS = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
];

export default function NewServiceRequestScreen() {
  const { providerId, providerName, categorySlug, options } = useLocalSearchParams<{
    providerId: string;
    providerName: string;
    categorySlug: string;
    options: string;
  }>();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const parsedOptions: string[] = options ? JSON.parse(options) : [];

  const [selectedOption, setSelectedOption] = useState(parsedOptions[0] || 'General Service');
  const [workType, setWorkType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [isOngoing, setIsOngoing] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [timeFrom, setTimeFrom] = useState('10:00');
  const [timeTo, setTimeTo] = useState('14:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [flatNumber, setFlatNumber] = useState('A-101');
  const [requirementsText, setRequirementsText] = useState('');
  const [proposedBudgetRs, setProposedBudgetRs] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [peopleCount, setPeopleCount] = useState('4');
  const [dietPreference, setDietPreference] = useState<'VEG' | 'NON_VEG'>('VEG');
  const [subjectOrClass, setSubjectOrClass] = useState('Class 8 Maths');

  const createMutation = useMutation({
    mutationFn: async () => {
      const extraFieldValues: Record<string, any> = {};
      if (categorySlug?.includes('domestic') || categorySlug?.includes('maid')) {
        extraFieldValues.numberOfPeople = parseInt(peopleCount, 10) || 4;
        extraFieldValues.diet = dietPreference;
      } else if (categorySlug?.includes('education') || categorySlug?.includes('tutor')) {
        extraFieldValues.subjectOrClass = subjectOrClass;
      }

      const budgetPaise = proposedBudgetRs ? Math.round(parseFloat(proposedBudgetRs) * 100) : undefined;

      const payload = {
        providerProfileId: providerId,
        categorySlug: categorySlug || 'general',
        optionSlug: selectedOption.toLowerCase().replace(/\s+/g, '-'),
        workType,
        isOngoing: workType === 'PERMANENT' ? isOngoing : false,
        startDate: new Date(startDate),
        endDate: workType === 'PERMANENT' && isOngoing ? undefined : new Date(endDate),
        dailyTimeSlot: { from: timeFrom, to: timeTo },
        daysOfWeek: selectedDays,
        flatNumber,
        requirementsText: requirementsText || `${selectedOption} for Flat ${flatNumber}`,
        extraFieldValues,
        proposedBudgetPaise: budgetPaise,
      };

      const res = await createRequest(payload);
      return res.data;
    },
    onSuccess: (data) => {
      Alert.alert(
        'Request Sent!',
        `Your request has been sent to ${providerName || 'the provider'}. They will be notified to accept and discuss terms.`,
        [{ text: 'View Request', onPress: () => router.replace(`/(app)/services/request/${data._id}` as never) }],
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to send request';
      setErrorMsg(msg);
      Alert.alert('Booking Error', msg);
    },
  });

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title={`Booking with ${providerName || 'Provider'}`}
          subtitle="Fill in your schedule and service requirements"
        />
        <Card.Content style={{ gap: 14 }}>
          {}
          <Text variant="labelMedium" style={styles.sectionLabel}>Select Service Option</Text>
          <View style={styles.chipRow}>
            {parsedOptions.map((opt: string) => (
              <Chip
                key={opt}
                selected={selectedOption === opt}
                onPress={() => setSelectedOption(opt)}
                style={styles.optionChip}
              >
                {opt}
              </Chip>
            ))}
          </View>

          {}
          <Text variant="labelMedium" style={styles.sectionLabel}>Duration Type</Text>
          <SegmentedButtons
            value={workType}
            onValueChange={(v) => {
              setWorkType(v as any);
              if (v === 'PERMANENT') setIsOngoing(true);
            }}
            buttons={[
              { value: 'TEMPORARY', label: 'Temporary (Days/Weeks)' },
              { value: 'PERMANENT', label: 'Permanent (Monthly/Ongoing)' },
            ]}
          />

          {}
          <View style={styles.row}>
            <TextInput
              label="Start Date (YYYY-MM-DD)"
              value={startDate}
              onChangeText={setStartDate}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
            />
            {(!isOngoing || workType === 'TEMPORARY') && (
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={endDate}
                onChangeText={setEndDate}
                style={[styles.input, { flex: 1 }]}
                mode="outlined"
              />
            )}
          </View>

          {workType === 'PERMANENT' && (
            <View style={styles.ongoingRow}>
              <Chip
                selected={isOngoing}
                onPress={() => setIsOngoing(!isOngoing)}
                icon={isOngoing ? 'check' : 'circle-outline'}
              >
                Ongoing Monthly Service (no fixed end date)
              </Chip>
            </View>
          )}

          {}
          <Text variant="labelMedium" style={styles.sectionLabel}>Daily Time Slot</Text>
          <View style={styles.row}>
            <TextInput
              label="From (HH:MM)"
              value={timeFrom}
              onChangeText={setTimeFrom}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
              placeholder="10:00"
            />
            <TextInput
              label="To (HH:MM)"
              value={timeTo}
              onChangeText={setTimeTo}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
              placeholder="14:00"
            />
          </View>

          {}
          <Text variant="labelMedium" style={styles.sectionLabel}>Working Days</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d, i) => {
              const active = selectedDays.includes(d.value);
              return (
                <Chip
                  key={i}
                  selected={active}
                  onPress={() => toggleDay(d.value)}
                  style={[styles.dayChip, active && styles.activeDayChip]}
                >
                  {d.label}
                </Chip>
              );
            })}
          </View>

          {}
          <TextInput
            label="Flat / Unit Number"
            value={flatNumber}
            onChangeText={setFlatNumber}
            mode="outlined"
          />

          {}
          {(categorySlug?.includes('domestic') || categorySlug?.includes('maid')) && (
            <View style={{ gap: 10 }}>
              <Text variant="labelMedium" style={styles.sectionLabel}>Domestic Details</Text>
              <TextInput
                label="Number of People in Household"
                value={peopleCount}
                onChangeText={setPeopleCount}
                keyboardType="numeric"
                mode="outlined"
              />
              <SegmentedButtons
                value={dietPreference}
                onValueChange={(v) => setDietPreference(v as any)}
                buttons={[
                  { value: 'VEG', label: 'Vegetarian Only' },
                  { value: 'NON_VEG', label: 'Veg & Non-Veg' },
                ]}
              />
            </View>
          )}

          {(categorySlug?.includes('education') || categorySlug?.includes('tutor')) && (
            <TextInput
              label="Subject & Class / Standard"
              value={subjectOrClass}
              onChangeText={setSubjectOrClass}
              mode="outlined"
              placeholder="e.g. Class 10 ICSE Physics, 3 days/week"
            />
          )}

          {}
          <TextInput
            label="Specific Requirements / Scope of Work"
            value={requirementsText}
            onChangeText={setRequirementsText}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="e.g. Deep clean 3BHK, wash utensils twice daily, prefer morning slot..."
          />

          {}
          <TextInput
            label="Proposed Budget (₹, optional)"
            value={proposedBudgetRs}
            onChangeText={setProposedBudgetRs}
            keyboardType="numeric"
            mode="outlined"
            placeholder="e.g. 5000"
            left={<TextInput.Affix text="₹" />}
          />

          {errorMsg ? <HelperText type="error">{errorMsg}</HelperText> : null}

          <Button
            mode="contained"
            style={styles.submitBtn}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            Send Service Request
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
  sectionLabel: { fontWeight: '600', color: '#37474F' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: { backgroundColor: '#E0F2F1' },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: '#ffffff' },
  ongoingRow: { marginTop: -4 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: { backgroundColor: '#ECEFF1' },
  activeDayChip: { backgroundColor: '#C8E6C9' },
  submitBtn: { marginTop: 8, borderRadius: 8, paddingVertical: 4 },
});
