import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createItemRequest, type DurationType } from '../../../../src/services/rental-requests';

export default function CreateItemRequestScreen() {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [neededFrom, setNeededFrom] = useState('');
  const [durationValue, setDurationValue] = useState('4');
  const [durationType, setDurationType] = useState<DurationType>('HOURS');
  const [budgetRs, setBudgetRs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const QUICK_CATEGORIES = [
    'drill', 'ladder', 'suitcase', 'party vessels', 'pressure cooker',
    'extension board', 'camping gear', 'kids cycles',
  ];

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      Alert.alert('Required', 'Please enter the item name you are looking for.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Required', 'Please enter or select a category.');
      return;
    }
    if (!neededFrom.trim()) {
      Alert.alert('Required', 'Please enter when you need the item (e.g. 2026-11-25T10:00).');
      return;
    }
    const dur = parseInt(durationValue, 10);
    if (!dur || dur < 1) {
      Alert.alert('Required', 'Duration must be at least 1.');
      return;
    }

    const neededDate = new Date(neededFrom.trim());
    if (isNaN(neededDate.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date and time (e.g. 2026-11-25T10:00).');
      return;
    }

    const budgetPaise = budgetRs.trim()
      ? Math.round(parseFloat(budgetRs) * 100)
      : undefined;

    try {
      setIsSubmitting(true);
      await createItemRequest({
        itemName: itemName.trim(),
        category: category.trim().toLowerCase(),
        purpose: purpose.trim() || undefined,
        neededFrom: neededDate.toISOString(),
        durationValue: dur,
        durationType,
        budgetPaise,
      });

      Alert.alert(
        'Request Sent!',
        'Your item request has been posted to the society. Neighbours will be notified and can respond with offers.',
        [{ text: 'View Requests', onPress: () => router.replace('/(app)/rentals/requests' as never) }],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.heading}>
          Request an Item
        </Text>
        <Text variant="bodySmall" style={styles.subheading}>
          Describe what you need. Society neighbours will be notified and can offer to lend it to you.
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              1. What do you need?
            </Text>

            <TextInput
              label="Item Name *"
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Telescopic Ladder 12ft"
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={{ marginTop: 8, marginBottom: 6, color: '#616161' }}>
              Category:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCats}
            >
              {QUICK_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  selected={category === cat}
                  onPress={() => setCategory(category === cat ? '' : cat)}
                  style={styles.catChip}
                  compact
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>

            <TextInput
              label="Custom Category (if not above)"
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. projector, tent, embroidery frame"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="What is it for? (optional)"
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g. Painting living room ceiling this weekend"
              multiline
              numberOfLines={2}
              mode="outlined"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              2. When & How Long?
            </Text>

            <TextInput
              label="Needed From (Date & Time) *"
              value={neededFrom}
              onChangeText={setNeededFrom}
              placeholder="e.g. 2026-11-25T10:00"
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info">Format: YYYY-MM-DDTHH:MM (24h)</HelperText>

            <View style={styles.row}>
              <TextInput
                label="Duration *"
                value={durationValue}
                onChangeText={setDurationValue}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />
              <View style={[styles.half, { paddingTop: 6 }]}>
                <SegmentedButtons
                  value={durationType}
                  onValueChange={(v) => setDurationType(v as DurationType)}
                  buttons={[
                    { value: 'HOURS', label: 'Hours' },
                    { value: 'DAYS', label: 'Days' },
                  ]}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              3. Budget (optional)
            </Text>

            <TextInput
              label="Max Willing to Pay (₹)"
              value={budgetRs}
              onChangeText={setBudgetRs}
              placeholder="e.g. 200"
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info">
              Lenders see this as a guide. The actual agreed price comes from their offer.
            </HelperText>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="send"
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={styles.submitBtn}
          contentStyle={{ height: 48 }}
        >
          Post Request to Society
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  heading: { fontWeight: '700', color: '#1565C0' },
  subheading: { color: '#757575', marginBottom: 4 },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardContent: { gap: 8 },
  sectionHeader: { fontWeight: '600', color: '#212121', marginBottom: 4 },
  input: { backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  half: { flex: 1 },
  quickCats: { gap: 8, paddingBottom: 8 },
  catChip: { backgroundColor: '#E3F2FD' },
  submitBtn: { borderRadius: 8, marginTop: 8 },
});
