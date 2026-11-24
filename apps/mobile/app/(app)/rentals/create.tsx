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
  Divider,
  Banner,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  verifyPrice,
  createRentalItem,
  type ItemCondition,
  type AiPriceVerification,
} from '../../../src/services/rentals';

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'HEAVILY_USED', label: 'Heavily Used' },
];

export default function CreateRentalItemScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photosText, setPhotosText] = useState('https://images.unsplash.com/photo-1504148455328-c376907d081c');
  const [ageYears, setAgeYears] = useState('1');
  const [condition, setCondition] = useState<ItemCondition>('GOOD');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Flat 302, Tower B');
  const [chargeHourly, setChargeHourly] = useState('');
  const [chargeDaily, setChargeDaily] = useState('');
  const [safeDeposit, setSafeDeposit] = useState('');
  const [usageRules, setUsageRules] = useState('Return clean; Indoor use only');

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verification, setVerification] = useState<AiPriceVerification | null>(null);
  const [prohibitedError, setProhibitedError] = useState<string | null>(null);

  const handleVerify = async () => {
    setProhibitedError(null);
    if (!name.trim() || !category.trim()) {
      Alert.alert('Required Fields', 'Please enter at least the item name and category.');
      return;
    }

    const hourly = chargeHourly ? Math.round(parseFloat(chargeHourly) * 100) : undefined;
    const daily = chargeDaily ? Math.round(parseFloat(chargeDaily) * 100) : undefined;
    const deposit = safeDeposit ? Math.round(parseFloat(safeDeposit) * 100) : 0;
    const purchase = purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined;

    if (!hourly && !daily) {
      Alert.alert('Pricing Needed', 'Please provide at least an hourly rate or a daily rate.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await verifyPrice({
        name: name.trim(),
        category: category.trim(),
        ageYears: parseFloat(ageYears) || 0,
        condition,
        estimatedPurchasePricePaise: purchase,
        chargeHourlyPaise: hourly,
        chargeDailyPaise: daily,
        safeDepositPaise: deposit,
      });
      setVerification(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Price verification failed';
      if (msg.toLowerCase().includes('prohibited')) {
        setProhibitedError(msg);
      } else {
        Alert.alert('Verification Notice', msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePublish = async () => {
    if (!name.trim() || !category.trim() || !description.trim() || !pickupLocation.trim()) {
      Alert.alert('Missing Details', 'Please fill in all mandatory fields.');
      return;
    }

    const hourly = chargeHourly ? Math.round(parseFloat(chargeHourly) * 100) : undefined;
    const daily = chargeDaily ? Math.round(parseFloat(chargeDaily) * 100) : undefined;
    const deposit = safeDeposit ? Math.round(parseFloat(safeDeposit) * 100) : 0;
    const purchase = purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined;

    if (!hourly && !daily) {
      Alert.alert('Pricing Needed', 'Please provide at least an hourly rate or a daily rate.');
      return;
    }

    const photos = photosText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (photos.length === 0) {
      Alert.alert('Baseline Photos', 'Please provide at least 1 photo URL showing the item condition.');
      return;
    }

    const rules = usageRules
      .split(';')
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const created = await createRentalItem({
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        photos,
        ageYears: parseFloat(ageYears) || 0,
        condition,
        estimatedPurchasePricePaise: purchase,
        pickupLocation: pickupLocation.trim(),
        chargeHourlyPaise: hourly,
        chargeDailyPaise: daily,
        safeDepositPaise: deposit,
        usageRules: rules,
      });

      if (created.status === 'PUBLISHED') {
        Alert.alert(
          'Listing Published!',
          'Your item has been price-verified by AI and is now live for society neighbours to rent.',
          [{ text: 'View Item', onPress: () => router.replace(`/(app)/rentals/${created._id}` as never) }],
        );
      } else {
        Alert.alert(
          'Saved as Draft',
          `AI pricing check flagged this listing (${created.aiPriceVerification.verdict}). You can adjust the rates or submit it to the President for review from My Items.`,
          [{ text: 'Go to My Items', onPress: () => router.replace('/(app)/rentals/my-items' as never) }],
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish listing';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.heading}>
          List an Item for Rent
        </Text>
        <Text variant="bodySmall" style={styles.subheading}>
          Lend tools, appliances or gear to neighbours with photo proof and deposit escrow.
        </Text>

        {prohibitedError && (
          <Banner
            visible
            icon="alert-octagon"
            actions={[{ label: 'Understand', onPress: () => setProhibitedError(null) }]}
            style={styles.prohibitedBanner}
          >
            {prohibitedError}
          </Banner>
        )}

        {/* Basic Details */}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              1. Item Information
            </Text>

            <TextInput
              label="Item Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Bosch Hammer Drill 650W"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Category *"
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. drill, ladder, suitcase, party vessels"
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info">
              Matches catalog or creates a custom society category.
            </HelperText>

            <TextInput
              label="Description *"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe condition, specifications, and what comes with it..."
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Baseline Condition Photo URLs (one per line) *"
              value={photosText}
              onChangeText={setPhotosText}
              multiline
              numberOfLines={2}
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info">
              Serves as baseline condition photo for dispute protection.
            </HelperText>
          </Card.Content>
        </Card>

        {/* Condition & Pickup */}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              2. Condition & Pickup
            </Text>

            <Text variant="bodyMedium" style={{ marginBottom: 6 }}>
              Item Condition:
            </Text>
            <SegmentedButtons
              value={condition}
              onValueChange={(val) => setCondition(val as ItemCondition)}
              buttons={CONDITIONS}
              style={{ marginBottom: 12 }}
            />

            <View style={styles.row}>
              <TextInput
                label="Approx Age (Years)"
                value={ageYears}
                onChangeText={setAgeYears}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />

              <TextInput
                label="Approx Purchase Price (₹)"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="e.g. 4000"
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>

            <TextInput
              label="Pickup Location (Flat / Tower) *"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Usage Rules (separate with semicolon ;)"
              value={usageRules}
              onChangeText={setUsageRules}
              placeholder="e.g. Return clean; Indoor use only; Do not force drill bits"
              mode="outlined"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Pricing & AI Verification */}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              3. Rental Pricing & Deposit
            </Text>

            <View style={styles.row}>
              <TextInput
                label="Charge / Hour (₹)"
                value={chargeHourly}
                onChangeText={setChargeHourly}
                placeholder="e.g. 40"
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />

              <TextInput
                label="Charge / Day (₹)"
                value={chargeDaily}
                onChangeText={setChargeDaily}
                placeholder="e.g. 200"
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>
            <HelperText type="info">Specify at least hourly or daily rate.</HelperText>

            <TextInput
              label="Refundable Safe Deposit (₹) *"
              value={safeDeposit}
              onChangeText={setSafeDeposit}
              placeholder="e.g. 500"
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info">
              Held safely in escrow during rental. Returned after handover check.
            </HelperText>

            <Button
              mode="outlined"
              icon="robot-outline"
              loading={isVerifying}
              disabled={isVerifying}
              onPress={handleVerify}
              style={{ marginVertical: 10 }}
            >
              Verify Price with AI
            </Button>

            {/* AI Verdict Card */}
            {verification && (
              <View
                style={[
                  styles.verdictBox,
                  verification.verdict === 'FAIR' ? styles.verdictFair : styles.verdictWarning,
                ]}
              >
                <View style={styles.verdictHeader}>
                  <Chip
                    icon={verification.verdict === 'FAIR' ? 'check-decagram' : 'alert-circle'}
                    style={[
                      styles.verdictChip,
                      verification.verdict === 'FAIR'
                        ? styles.verdictChipFair
                        : styles.verdictChipWarning,
                    ]}
                  >
                    AI Verdict: {verification.verdict}
                  </Chip>
                </View>

                <Text variant="bodySmall" style={styles.verdictReason}>
                  {verification.reason}
                </Text>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="labelSmall" style={styles.suggestedTitle}>
                  Suggested Fair Market Ranges:
                </Text>
                {verification.suggestedHourlyRangePaise && (
                  <Text variant="bodySmall">
                    • Hourly:{' '}
                    ₹{(verification.suggestedHourlyRangePaise.min / 100).toFixed(0)} - ₹
                    {(verification.suggestedHourlyRangePaise.max / 100).toFixed(0)} / hr
                  </Text>
                )}
                {verification.suggestedDailyRangePaise && (
                  <Text variant="bodySmall">
                    • Daily: ₹{(verification.suggestedDailyRangePaise.min / 100).toFixed(0)}{' '}
                    - ₹{(verification.suggestedDailyRangePaise.max / 100).toFixed(0)} / day
                  </Text>
                )}
                {verification.suggestedDepositRangePaise && (
                  <Text variant="bodySmall">
                    • Safe Deposit:{' '}
                    ₹{(verification.suggestedDepositRangePaise.min / 100).toFixed(0)} - ₹
                    {(verification.suggestedDepositRangePaise.max / 100).toFixed(0)}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Action Button */}
        <Button
          mode="contained"
          icon="upload"
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handlePublish}
          style={styles.submitBtn}
          contentStyle={{ height: 48 }}
        >
          {verification?.verdict === 'FAIR' ? 'Publish Listing' : 'Submit Listing (AI Verified)'}
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
  sectionHeader: { fontWeight: '600', color: '#212121', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  prohibitedBanner: { backgroundColor: '#FFEBEE', borderRadius: 8 },
  verdictBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  verdictFair: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  verdictWarning: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFA000',
    borderWidth: 1,
  },
  verdictHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  verdictChip: { alignSelf: 'flex-start' },
  verdictChipFair: { backgroundColor: '#C8E6C9' },
  verdictChipWarning: { backgroundColor: '#FFE082' },
  verdictReason: { color: '#424242', fontWeight: '500' },
  suggestedTitle: { fontWeight: '700', color: '#616161', marginBottom: 4 },
  submitBtn: { borderRadius: 8, marginTop: 8 },
});
