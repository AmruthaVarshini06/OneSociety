import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupOrder } from '../../../src/services/group-orders';
import { submitRating, getMyRating } from '../../../src/services/disputes';

export default function RateOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [productRating, setProductRating] = useState(5);
  const [productComment, setProductComment] = useState('');
  const [supplierRating, setSupplierRating] = useState(5);
  const [supplierComment, setSupplierComment] = useState('');

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['group-order', id],
    queryFn: () => getGroupOrder(id),
    enabled: !!id,
  });

  const { data: ratingData, isLoading: isRatingLoading } = useQuery({
    queryKey: ['my-rating', id],
    queryFn: () => getMyRating(id),
    enabled: !!id,
  });

  const order = orderData?.order;
  const existingRating = ratingData?.rating;

  useEffect(() => {
    if (existingRating) {
      setProductRating(existingRating.productRating);
      setProductComment(existingRating.productComment ?? '');
      setSupplierRating(existingRating.supplierRating);
      setSupplierComment(existingRating.supplierComment ?? '');
    }
  }, [existingRating]);

  const ratingMutation = useMutation({
    mutationFn: () =>
      submitRating(id, {
        productRating,
        productComment: productComment || undefined,
        supplierRating,
        supplierComment: supplierComment || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rating', id] });
      Alert.alert('Thank You!', 'Your rating and feedback have been recorded.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message ?? err.message ?? 'Failed to submit rating');
    },
  });

  if (isOrderLoading || isRatingLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading rating form...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Order not found.</Text>
      </SafeAreaView>
    );
  }

  const renderStars = (current: number, setRating: (r: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, star <= current ? styles.starActive : styles.starInactive]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.starScore}>{current} / 5</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.title}>
              Rate & Review: {order.productName}
            </Text>
            <Text style={styles.subtext}>
              Help your society neighbors by rating the product quality and supplier reliability.
            </Text>

            <Divider style={styles.divider} />

            {}
            <Text variant="labelLarge" style={styles.label}>
              1. Product Quality Rating
            </Text>
            {renderStars(productRating, setProductRating)}

            <TextInput
              label="Product Feedback (Optional)"
              value={productComment}
              onChangeText={setProductComment}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
              placeholder="e.g. Fresh, well-packaged, good grain size..."
            />

            <Divider style={styles.divider} />

            {}
            <Text variant="labelLarge" style={styles.label}>
              2. Supplier Delivery & Service Rating
            </Text>
            {renderStars(supplierRating, setSupplierRating)}

            <TextInput
              label="Supplier Feedback (Optional)"
              value={supplierComment}
              onChangeText={setSupplierComment}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
              placeholder="e.g. Punctual delivery, polite driver, intact cartons..."
            />

            <Button
              mode="contained"
              style={styles.submitBtn}
              loading={ratingMutation.isPending}
              disabled={ratingMutation.isPending}
              onPress={() => ratingMutation.mutate()}
            >
              {existingRating ? 'Update Review' : 'Submit Review'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF' },
  title: { fontWeight: 'bold' },
  divider: { marginVertical: 14 },
  label: { fontWeight: 'bold', marginBottom: 6, color: '#333333' },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  star: { fontSize: 32, marginRight: 6 },
  starActive: { color: '#FBC02D' },
  starInactive: { color: '#E0E0E0' },
  starScore: { marginLeft: 8, fontWeight: 'bold', color: '#555555' },
  input: { marginBottom: 12 },
  subtext: { color: '#666666', fontSize: 13, marginTop: 2 },
  errorText: { color: '#C62828', fontSize: 16 },
  submitBtn: { backgroundColor: '#1565C0', marginTop: 8 },
});
