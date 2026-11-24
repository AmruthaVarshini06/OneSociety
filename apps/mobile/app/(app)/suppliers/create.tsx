import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createSupplier, type CreateSupplierPayload } from '../../../src/services/suppliers';

interface FormState {
  username: string;
  tempPassword: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  gstNumber: string;
}

interface FormErrors {
  username?: string;
  tempPassword?: string;
  businessName?: string;
  contactName?: string;
  contactPhone?: string;
  gstNumber?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.username.trim()) errors.username = 'Username is required';
  else if (!/^[a-z0-9_]{3,30}$/.test(form.username))
    errors.username = 'Lowercase letters, digits, underscores (3–30 chars)';
  if (!form.tempPassword.trim()) errors.tempPassword = 'Password is required';
  else if (form.tempPassword.length < 8) errors.tempPassword = 'At least 8 characters';
  if (!form.businessName.trim()) errors.businessName = 'Business name is required';
  if (!form.contactName.trim()) errors.contactName = 'Contact name is required';
  if (!form.contactPhone.trim()) errors.contactPhone = 'Phone is required';
  else if (!/^[6-9]\d{9}$/.test(form.contactPhone))
    errors.contactPhone = 'Enter a valid 10-digit Indian mobile number';
  if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    form.gstNumber.toUpperCase(),
  )) {
    errors.gstNumber = 'Invalid GSTIN format (15 characters)';
  }
  return errors;
}

export default function CreateSupplierScreen() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    username: '',
    tempPassword: '',
    businessName: '',
    contactName: '',
    contactPhone: '',
    gstNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplier(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      const warning = result.gstWarning
        ? `\n\nNote: ${result.gstWarning} — GST status set to Pending Review.`
        : '';
      Alert.alert(
        'Supplier Created',
        `Account created for ${result.supplier.businessName}.${warning}`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create supplier. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    setSubmitted(true);
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    const payload: CreateSupplierPayload = {
      username: form.username.toLowerCase(),
      tempPassword: form.tempPassword,
      businessName: form.businessName,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
    };
    if (form.gstNumber.trim()) payload.gstNumber = form.gstNumber.toUpperCase();
    mutation.mutate(payload);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.heading}>
          Add Supplier
        </Text>
        <Text variant="bodyMedium" style={styles.subheading}>
          Creates a login for the supplier. They will receive credentials via WhatsApp.
        </Text>

        {}
        <Text variant="titleSmall" style={styles.section}>Login Credentials</Text>
        <TextInput
          label="Username *"
          value={form.username}
          onChangeText={(v) => setField('username', v.toLowerCase())}
          mode="outlined"
          autoCapitalize="none"
          error={!!errors.username}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.username}>
          {errors.username}
        </HelperText>

        <TextInput
          label="Temporary Password *"
          value={form.tempPassword}
          onChangeText={(v) => setField('tempPassword', v)}
          mode="outlined"
          secureTextEntry
          error={!!errors.tempPassword}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.tempPassword}>
          {errors.tempPassword}
        </HelperText>

        {}
        <Text variant="titleSmall" style={styles.section}>Business Details</Text>
        <TextInput
          label="Business Name *"
          value={form.businessName}
          onChangeText={(v) => setField('businessName', v)}
          mode="outlined"
          error={!!errors.businessName}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.businessName}>
          {errors.businessName}
        </HelperText>

        <TextInput
          label="Contact Person *"
          value={form.contactName}
          onChangeText={(v) => setField('contactName', v)}
          mode="outlined"
          error={!!errors.contactName}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.contactName}>
          {errors.contactName}
        </HelperText>

        <TextInput
          label="Mobile Number *"
          value={form.contactPhone}
          onChangeText={(v) => setField('contactPhone', v.replace(/\D/g, ''))}
          mode="outlined"
          keyboardType="phone-pad"
          maxLength={10}
          error={!!errors.contactPhone}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.contactPhone}>
          {errors.contactPhone}
        </HelperText>

        {}
        <Text variant="titleSmall" style={styles.section}>Optional</Text>
        <TextInput
          label="GSTIN (optional)"
          value={form.gstNumber}
          onChangeText={(v) => setField('gstNumber', v.toUpperCase())}
          mode="outlined"
          autoCapitalize="characters"
          maxLength={15}
          error={!!errors.gstNumber}
          style={styles.input}
        />
        <HelperText type={errors.gstNumber ? 'error' : 'info'} visible>
          {errors.gstNumber ?? '15-character GSTIN. Auto-verified on save.'}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          Create Supplier
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  subheading: { color: '#757575', marginBottom: 20 },
  section: { color: '#1565C0', fontWeight: '600', marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  submitBtn: { marginTop: 24 },
  submitBtnContent: { paddingVertical: 6 },
});
