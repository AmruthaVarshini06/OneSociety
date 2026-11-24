import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Switch, SegmentedButtons, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitReview } from '../../../../src/services/service-hub-reviews';

export default function SubmitServiceReviewScreen() {
  const { requestId, agreementId } = useLocalSearchParams<{
    requestId: string;
    agreementId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [reviewType, setReviewType] = useState<'MID_SERVICE' | 'FINAL'>('FINAL');
  const [overallRating, setOverallRating] = useState('5');
  const [punctualityRating, setPunctualityRating] = useState('5');
  const [qualityRating, setQualityRating] = useState('5');
  const [behaviourRating, setBehaviourRating] = useState('5');
  const [comment, setComment] = useState('');
  const [wouldHireAgain, setWouldHireAgain] = useState(true);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      return submitReview({
        agreementId: agreementId || requestId,
        reviewType,
        overallRating: parseInt(overallRating, 10),
        punctualityRating: parseInt(punctualityRating, 10),
        qualityRating: parseInt(qualityRating, 10),
        behaviourRating: parseInt(behaviourRating, 10),
        comment,
        wouldHireAgain,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews'] });
      Alert.alert('Review Submitted', 'Thank you for your rating! It helps neighbours find trusted providers.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  const StarSelector = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <View style={styles.starRow}>
      <Text variant="bodyMedium" style={{ flex: 1, color: '#37474F' }}>{label}</Text>
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        buttons={[
          { value: '1', label: '1★' },
          { value: '2', label: '2★' },
          { value: '3', label: '3★' },
          { value: '4', label: '4★' },
          { value: '5', label: '5★' },
        ]}
        style={{ flex: 1.5 }}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Rate & Review Service"
          subtitle="Share feedback with the society community"
        />
        <Card.Content style={{ gap: 14 }}>
          <Text variant="labelMedium">Review Type</Text>
          <SegmentedButtons
            value={reviewType}
            onValueChange={(v) => setReviewType(v as any)}
            buttons={[
              { value: 'MID_SERVICE', label: 'Mid-Service Check' },
              { value: 'FINAL', label: 'Final Completion Review' },
            ]}
          />

          <Divider />

          <StarSelector
            label="Overall Experience"
            value={overallRating}
            onChange={setOverallRating}
          />
          <StarSelector
            label="Punctuality / On-Time"
            value={punctualityRating}
            onChange={setPunctualityRating}
          />
          <StarSelector
            label="Work Quality"
            value={qualityRating}
            onChange={setQualityRating}
          />
          <StarSelector
            label="Behaviour & Etiquette"
            value={behaviourRating}
            onChange={setBehaviourRating}
          />

          <Divider />

          <TextInput
            label="Feedback & Comments"
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Describe the quality of work, punctuality, and attitude..."
          />

          {reviewType === 'FINAL' && (
            <View style={styles.hireAgainRow}>
              <Text variant="bodyMedium" style={{ flex: 1 }}>Would you hire this provider again?</Text>
              <Switch value={wouldHireAgain} onValueChange={setWouldHireAgain} color="#2E7D32" />
            </View>
          )}

          <Button
            mode="contained"
            buttonColor="#2E7D32"
            loading={reviewMutation.isPending}
            onPress={() => reviewMutation.mutate()}
            style={{ marginTop: 8 }}
          >
            Submit Review
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
  starRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  hireAgainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
});
