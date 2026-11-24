import React, { useState, useEffect } from 'react';
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
  Chip,
  Card,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile } from '../../../src/services/suppliers';

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: '#FF9800',
  GST_VERIFIED: '#2196F3',
  APPROVED: '#4CAF50',
  REJECTED: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  GST_VERIFIED: 'GST Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

interface FormState {
  businessName: string;
  contactName: string;
  contactPhone: string;
  gstNumber: string;
}

interface FormErrors {
  businessName?: string;
  contactName?: string;
  contactPhone?: string;
  gstNumber?: string;
}

function validateProfile(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.businessName.trim()) errors.businessName = 'Business name is required';
  if (!form.contactName.trim()) errors.contactName = 'Contact name is required';
  if (!form.contactPhone.trim()) errors.contactPhone = 'Phone is required';
  else if (!/^[6-9]\d{9}$/.test(form.contactPhone))
    errors.contactPhone = 'Enter a valid 10-digit Indian mobile number';
  if (
    form.gstNumber &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      form.gstNumber.toUpperCase(),
    )
  ) {
    errors.gstNumber = 'Invalid GSTIN format (15 characters)';
  }
  return errors;
}

export default function SupplierProfileScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    businessName: '',
    contactName: '',
    contactPhone: '',
    gstNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplierMe'],
    queryFn: getMyProfile,
  });

  // Populate form when data loads
  useEffect(() => {
    if (data?.supplier) {
      setForm({
        businessName: data.supplier.businessName,
        contactName: data.supplier.contactName,
        contactPhone: data.supplier.contactPhone,
        gstNumber: data.supplier.gstNumber ?? '',
      });
    }
  }, [data]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof updateMyProfile>[0] = {
        businessName: form.businessName,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
      };
      if (form.gstNumber.trim()) payload.gstNumber = form.gstNumber.toUpperCase();
      return updateMyProfile(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supplierMe'] });
      setEditing(false);
      let msg = result.message ?? 'Profile updated.';
      if (result.gstWarning) {
        msg += `\n\nGST Note: ${result.gstWarning}`;
      }
      Alert.alert('Saved', msg);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSave = () => {
    const validationErrors = validateProfile(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    updateMutation.mutate();
  };

  const handleCancelEdit = () => {
    if (data?.supplier) {
      setForm({
        businessName: data.supplier.businessName,
        contactName: data.supplier.contactName,
        contactPhone: data.supplier.contactPhone,
        gstNumber: data.supplier.gstNumber ?? '',
      });
    }
    setErrors({});
    setEditing(false);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  // ── Error ──
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile.</Text>
        <Button onPress={() => refetch()} style={{ marginTop: 12 }}>
          Retry
        </Button>
      </View>
    );
  }

  const { supplier } = data;
  const statusColor = STATUS_COLORS[supplier.verificationStatus] ?? '#9E9E9E';
  const statusLabel = STATUS_LABELS[supplier.verificationStatus] ?? supplier.verificationStatus;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header: verification badge */}
        <View style={styles.headerRow}>
          <Text variant="headlineSmall" style={styles.heading}>
            My Profile
          </Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusColor }]}
            textStyle={styles.statusChipText}
          >
            {statusLabel}
          </Chip>
        </View>

        {/* Rejection note */}
        {supplier.verificationStatus === 'REJECTED' && supplier.verificationNote && (
          <Card style={[styles.card, styles.rejectedCard]} mode="elevated">
            <Card.Content>
              <Text variant="labelSmall" style={styles.rejectedLabel}>
                REJECTION REASON
              </Text>
              <Text variant="bodyMedium" style={styles.rejectedNote}>
                {supplier.verificationNote}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Approval note */}
        {supplier.verificationStatus === 'APPROVED' && (
          <Card style={[styles.card, styles.approvedCard]} mode="elevated">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.approvedText}>
                ✅ Your account is approved. You can participate in group orders.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Pending note */}
        {(supplier.verificationStatus === 'PENDING_REVIEW' ||
          supplier.verificationStatus === 'GST_VERIFIED') && (
          <Card style={[styles.card, styles.pendingCard]} mode="elevated">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.pendingText}>
                ⏳ Your account is pending president approval.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Business details card */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Business Details
              </Text>
              {!editing && (
                <Button compact onPress={() => setEditing(true)} mode="text">
                  Edit
                </Button>
              )}
            </View>
            <Divider style={styles.divider} />

            {editing ? (
              <>
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
                  {errors.gstNumber ??
                    'Changing GST resets verification status to Pending Review.'}
                </HelperText>

                <View style={styles.editActions}>
                  <Button onPress={handleCancelEdit} disabled={updateMutation.isPending}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={updateMutation.isPending}
                    disabled={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </View>
              </>
            ) : (
              <>
                <InfoRow label="Business Name" value={supplier.businessName} />
                <InfoRow label="Contact Person" value={supplier.contactName} />
                <InfoRow label="Mobile" value={supplier.contactPhone} />
                <InfoRow
                  label="GSTIN"
                  value={
                    supplier.gstNumber
                      ? `${supplier.gstNumber}${supplier.gstVerified ? ' ✓ verified' : ''}`
                      : 'Not provided'
                  }
                />
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#757575' },
  errorText: { color: '#F44336' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heading: { fontWeight: '700', color: '#1565C0' },
  statusChip: { borderRadius: 12 },
  statusChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  card: { borderRadius: 10, backgroundColor: '#fff' },
  rejectedCard: { borderLeftWidth: 4, borderLeftColor: '#F44336' },
  approvedCard: { borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  pendingCard: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  rejectedLabel: { color: '#F44336', fontWeight: '700', marginBottom: 4 },
  rejectedNote: { color: '#424242' },
  approvedText: { color: '#2E7D32' },
  pendingText: { color: '#E65100' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '700', color: '#212121' },
  divider: { marginVertical: 8 },
  input: { backgroundColor: '#fff', marginTop: 4 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  infoRow: { paddingVertical: 6 },
  infoLabel: { color: '#9E9E9E', marginBottom: 2 },
  infoValue: { color: '#212121' },
});
