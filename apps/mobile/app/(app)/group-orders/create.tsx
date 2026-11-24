import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createGroupOrder, type CreateGroupOrderPayload } from '../../../src/services/group-orders';

interface FormState {
  productName: string;
  productCategory: string;
  description: string;
  unit: string;
  minimumQuantity: string;
  demandCloseDays: string;
}

interface FormErrors {
  productName?: string;
  productCategory?: string;
  description?: string;
  unit?: string;
  minimumQuantity?: string;
  demandCloseDays?: string;
}

function validate(f: FormState): FormErrors {
  const e: FormErrors = {};
  if (!f.productName.trim()) e.productName = 'Product name is required';
  if (!f.productCategory.trim()) e.productCategory = 'Category is required';
  if (!f.description.trim() || f.description.trim().length < 10)
    e.description = 'Description must be at least 10 characters';
  if (!f.unit.trim()) e.unit = 'Unit is required';
  const minQty = parseInt(f.minimumQuantity, 10);
  if (!minQty || minQty < 1) e.minimumQuantity = 'Enter a positive minimum quantity';
  const days = parseFloat(f.demandCloseDays);
  if (!days || days < 0.5) e.demandCloseDays = 'At least half a day (0.5) required';
  if (days > 30) e.demandCloseDays = 'Maximum 30 days';
  return e;
}

export default function CreateGroupOrderScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    productName: '',
    productCategory: '',
    description: '',
    unit: 'piece',
    minimumQuantity: '',
    demandCloseDays: '7',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof FormState, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (submitted) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateGroupOrderPayload) => createGroupOrder(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['group-orders'] });
      Alert.alert('Created', `Demand window opened for "${result.order.productName}"`, [
        { text: 'View', onPress: () => router.replace(`/(app)/group-orders/${result.order._id}` as never) },
        { text: 'Back to list', onPress: () => router.back() },
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    setSubmitted(true);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const days = parseFloat(form.demandCloseDays);
    const closeAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    mutation.mutate({
      productName: form.productName.trim(),
      productCategory: form.productCategory.trim(),
      description: form.description.trim(),
      unit: form.unit.trim() || 'piece',
      minimumQuantity: parseInt(form.minimumQuantity, 10),
      demandCloseAt: closeAt,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.heading}>Open Demand Window</Text>
        <Text variant="bodyMedium" style={styles.sub}>
          Residents will express how many units they want. The order proceeds only if the minimum is reached.
        </Text>

        <Text variant="titleSmall" style={styles.section}>Product</Text>
        <TextInput label="Product Name *" value={form.productName} onChangeText={(v) => setField('productName', v)} mode="outlined" error={!!errors.productName} style={styles.input} />
        <HelperText type="error" visible={!!errors.productName}>{errors.productName}</HelperText>

        <TextInput label="Category *" value={form.productCategory} onChangeText={(v) => setField('productCategory', v)} mode="outlined" error={!!errors.productCategory} style={styles.input} placeholder="e.g. Groceries, Electronics, Dairy" />
        <HelperText type="error" visible={!!errors.productCategory}>{errors.productCategory}</HelperText>

        <TextInput label="Description *" value={form.description} onChangeText={(v) => setField('description', v)} mode="outlined" multiline numberOfLines={3} error={!!errors.description} style={styles.input} />
        <HelperText type="error" visible={!!errors.description}>{errors.description}</HelperText>

        <Text variant="titleSmall" style={styles.section}>Quantity</Text>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <TextInput label="Unit *" value={form.unit} onChangeText={(v) => setField('unit', v)} mode="outlined" error={!!errors.unit} style={styles.input} placeholder="kg / litre / piece" />
            <HelperText type="error" visible={!!errors.unit}>{errors.unit}</HelperText>
          </View>
          <View style={[styles.flex1, styles.ml8]}>
            <TextInput label="Min Quantity *" value={form.minimumQuantity} onChangeText={(v) => setField('minimumQuantity', v.replace(/[^0-9]/g, ''))} mode="outlined" keyboardType="number-pad" error={!!errors.minimumQuantity} style={styles.input} />
            <HelperText type="error" visible={!!errors.minimumQuantity}>{errors.minimumQuantity}</HelperText>
          </View>
        </View>

        <Text variant="titleSmall" style={styles.section}>Deadline</Text>
        <TextInput
          label="Days to collect demand *"
          value={form.demandCloseDays}
          onChangeText={(v) => setField('demandCloseDays', v.replace(/[^0-9.]/g, ''))}
          mode="outlined"
          keyboardType="decimal-pad"
          error={!!errors.demandCloseDays}
          style={styles.input}
        />
        <HelperText type={errors.demandCloseDays ? 'error' : 'info'} visible>
          {errors.demandCloseDays ?? `Window closes ${form.demandCloseDays || '?'} day(s) from now`}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          Open Demand Window
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  sub: { color: '#757575', marginBottom: 16 },
  section: { color: '#1565C0', fontWeight: '600', marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  ml8: { marginLeft: 8 },
  submitBtn: { marginTop: 20 },
  submitBtnContent: { paddingVertical: 6 },
});
