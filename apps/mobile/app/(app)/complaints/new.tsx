import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Banner,
  Dialog,
  Portal,
  HelperText,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  checkComplaintScope,
  getSimilarComplaints,
  submitComplaint,
  type ScopeCheckResponse,
} from '../../../src/services/complaints';

const CATEGORIES = [
  'Lift',
  'Water supply',
  'Electricity in common areas',
  'Drainage and plumbing in common areas',
  'Security',
  'Cleanliness and garbage',
  'Parking',
  'Garden and landscaping',
  'Fire safety',
  'Structural issues in common areas',
  'Clubhouse, gym, pool, and play area',
  'Other',
];

const SAMPLE_PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500', // repair/machinery
  'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=500', // construction/cracks
  'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500', // pipes/leak
  'https://images.unsplash.com/photo-1509783236416-c9ad59bae472?w=500', // lift / hallway
];

export default function NewComplaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const prelinkedClusterId = params.linkToClusterId as string | undefined;

  const [category, setCategory] = useState('Lift');
  const [block, setBlock] = useState('B');
  const [floor, setFloor] = useState('');
  const [specificArea, setSpecificArea] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([SAMPLE_PHOTO_PRESETS[0]]);
  const [linkToClusterId, setLinkToClusterId] = useState<string | undefined>(prelinkedClusterId);

  // AI Scope dialog state
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [scopeResult, setScopeResult] = useState<ScopeCheckResponse | null>(null);

  // Similar complaints state
  const [similarMatches, setSimilarMatches] = useState<any[]>([]);
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trigger similarity check when description or area changes
  const checkSimilarIssues = async () => {
    if (!description.trim() || !specificArea.trim()) return;
    setCheckingSimilar(true);
    try {
      const res = await getSimilarComplaints({
        category,
        block,
        specificArea,
        description,
      });
      setSimilarMatches(res.data.matches || []);
    } catch (err) {
      console.warn('Similar issue check failed:', err);
    } finally {
      setCheckingSimilar(false);
    }
  };

  const handleScopeCheckAndSubmit = async () => {
    if (!specificArea.trim()) {
      Alert.alert('Location Required', 'Please specify the exact area (e.g. Lift 2, Basement Parking, Corridor near 201).');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide a clear description of the problem.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Photo Required', 'Please add at least 1 photo for evidence.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Run Scope Check
      const scopeRes = await checkComplaintScope({
        description,
        specificArea,
        category,
      });

      if (scopeRes.data.scopeStatus === 'INTERNAL_FLAT_BLOCKED') {
        setScopeResult(scopeRes.data);
        setScopeModalVisible(true);
        setSubmitting(false);
        return;
      }

      // 2. Submit complaint
      const res = await submitComplaint({
        category,
        location: {
          block: block === 'NONE' ? undefined : block,
          floor: floor.trim() || undefined,
          specificArea: specificArea.trim(),
        },
        description: description.trim(),
        photos,
        linkToClusterId,
      });

      Alert.alert(
        'Complaint Submitted',
        `Your complaint #${res.data.complaint.complaintNumber} has been logged under Issue #${res.data.cluster.clusterNumber}. Priority: ${res.data.cluster.priorityLevel}.`,
        [
          {
            text: 'View Issue',
            onPress: () => router.replace(`/(app)/complaints/${res.data.cluster._id}` as any),
          },
        ]
      );
    } catch (err: any) {
      if (err.response?.data?.isScopeError) {
        setScopeResult(err.response.data);
        setScopeModalVisible(true);
      } else {
        Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to submit complaint.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addPresetPhoto = () => {
    if (photos.length >= 5) {
      Alert.alert('Photo Limit', 'Maximum 5 photos allowed.');
      return;
    }
    const nextPhoto = SAMPLE_PHOTO_PRESETS[photos.length % SAMPLE_PHOTO_PRESETS.length];
    setPhotos([...photos, nextPhoto]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Emergency Notice */}
      <Banner visible icon="alert-octagon" style={styles.emergencyBanner}>
        <Text style={styles.emergencyText}>
          🚨 EMERGENCY: For fire, gas leaks, or people trapped in lifts, immediately call security or use Emergency Gate Alert!
        </Text>
      </Banner>

      {/* Scope Info Card */}
      <Card style={styles.infoCard} mode="contained">
        <Card.Content>
          <Text style={styles.infoTitle}>🏢 Common Areas & Facilities Only</Text>
          <Text style={styles.infoSubtitle}>
            Issues inside personal flats are NOT handled here. For flat repairs, hire verified neighbours or pros on ServiceHub.
          </Text>
        </Card.Content>
      </Card>

      {/* Category Selection */}
      <Text style={styles.sectionLabel}>Select Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {CATEGORIES.map(c => (
          <Chip
            key={c}
            selected={category === c}
            onPress={() => setCategory(c)}
            style={styles.chip}
          >
            {c}
          </Chip>
        ))}
      </ScrollView>

      {/* Location */}
      <Text style={styles.sectionLabel}>Location in Society *</Text>
      <Text style={styles.subLabel}>Block / Tower</Text>
      <View style={styles.blockRow}>
        {['A', 'B', 'C', 'D', 'NONE'].map(b => (
          <Chip
            key={b}
            selected={block === b}
            onPress={() => setBlock(b)}
            style={styles.blockChip}
          >
            {b === 'NONE' ? 'Common Area' : `Block ${b}`}
          </Chip>
        ))}
      </View>

      <TextInput
        label="Floor (optional, e.g. 2nd floor, Terrace, Basement)"
        value={floor}
        onChangeText={setFloor}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Specific Location * (e.g. Lift 2, Staircase light, Tank pipe)"
        value={specificArea}
        onChangeText={setSpecificArea}
        onBlur={checkSimilarIssues}
        mode="outlined"
        style={styles.input}
      />

      {/* Description */}
      <Text style={styles.sectionLabel}>Problem Description *</Text>
      <TextInput
        label="Describe the issue clearly"
        value={description}
        onChangeText={setDescription}
        onBlur={checkSimilarIssues}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      <HelperText type="info">
        Our AI automatically checks for scope, life/safety danger, and similarity with existing reports.
      </HelperText>

      {/* Similar Open Complaints Warning / Suggestion */}
      {similarMatches.length > 0 && (
        <Card style={styles.similarCard} mode="elevated">
          <Card.Content>
            <Text style={styles.similarHeader}>🔍 Similar Open Issue Found!</Text>
            <Text style={styles.similarSub}>
              Residents have already reported a similar issue. You can link your report to increase its priority or post independently.
            </Text>

            {similarMatches.map((m, idx) => (
              <View key={idx} style={styles.matchItem}>
                <View style={styles.matchRow}>
                  <Text style={styles.matchTitle}>#{m.cluster.clusterNumber} {m.cluster.title}</Text>
                  <Chip style={styles.matchChip} compact>
                    {m.cluster.reportCount} reports
                  </Chip>
                </View>
                <Text style={styles.matchReason}>Match: {m.matchReason}</Text>
                <Button
                  mode={linkToClusterId === m.cluster._id ? 'contained' : 'outlined'}
                  compact
                  style={styles.linkButton}
                  onPress={() => setLinkToClusterId(linkToClusterId === m.cluster._id ? undefined : m.cluster._id)}
                >
                  {linkToClusterId === m.cluster._id ? '✓ Linked to this issue' : '+ Link my report to this issue'}
                </Button>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Photo Upload Section */}
      <Text style={styles.sectionLabel}>Photos (1 to 5) *</Text>
      <View style={styles.photosContainer}>
        {photos.map((uri, idx) => (
          <View key={idx} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.removePhotoBadge} onPress={() => removePhoto(idx)}>
              <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < 5 && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={addPresetPhoto}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Submit Button */}
      <Button
        mode="contained"
        onPress={handleScopeCheckAndSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitBtn}
        contentStyle={{ height: 48 }}
      >
        Submit Complaint
      </Button>

      {/* AI Scope Dialog */}
      <Portal>
        <Dialog visible={scopeModalVisible} onDismiss={() => setScopeModalVisible(false)}>
          <Dialog.Title>🏠 Flat-Internal Issue Detected</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.modalText}>
              {scopeResult?.message ||
                'This looks like a problem inside your flat. Common society funds cannot be used for internal repairs.'}
            </Text>
            <Text style={styles.modalSubText}>
              You can quickly hire a verified neighbour or professional technician on ServiceHub.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setScopeModalVisible(false)}>Dismiss</Button>
            <Button
              mode="contained"
              onPress={() => {
                setScopeModalVisible(false);
                router.push('/(app)/services' as any);
              }}
            >
              Open ServiceHub
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  emergencyBanner: { backgroundColor: '#FEE2E2', borderRadius: 8, marginBottom: 12 },
  emergencyText: { color: '#991B1B', fontWeight: '700', fontSize: 13 },
  infoCard: { backgroundColor: '#F1F5F9', borderRadius: 8, marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  infoSubtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 12, marginBottom: 6 },
  subLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  chipRow: { marginBottom: 10 },
  chip: { marginRight: 6 },
  blockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  blockChip: { marginBottom: 4 },
  input: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  similarCard: { backgroundColor: '#FEF3C7', borderRadius: 10, marginVertical: 12 },
  similarHeader: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  similarSub: { fontSize: 12, color: '#B45309', marginVertical: 4 },
  matchItem: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, marginTop: 8 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 },
  matchChip: { height: 24 },
  matchReason: { fontSize: 11, color: '#64748B', marginTop: 2 },
  linkButton: { marginTop: 6 },
  photosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  photoWrapper: { position: 'relative' },
  photoThumb: { width: 72, height: 72, borderRadius: 8 },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  addPhotoButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addPhotoIcon: { fontSize: 22 },
  addPhotoText: { fontSize: 10, color: '#64748B', marginTop: 2 },
  divider: { marginVertical: 16 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 8 },
  modalText: { fontSize: 14, color: '#1E293B', marginBottom: 8 },
  modalSubText: { fontSize: 12, color: '#64748B' },
});
