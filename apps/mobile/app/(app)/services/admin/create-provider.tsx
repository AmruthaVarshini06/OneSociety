import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, TextInput, SegmentedButtons, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExternalAccount } from '../../../../src/services/service-hub-admin';

export default function CreateExternalProviderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [categorySlug, setCategorySlug] = useState('domestic-help');
  const [optionsStr, setOptionsStr] = useState('Cleaning + Washing Utensils, Cooking');
  const [accountType, setAccountType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [expiryDays, setExpiryDays] = useState('30');
  const [oneTimePass, setOneTimePass] = useState(
    () => 'OnePass#' + Math.floor(1000 + Math.random() * 9000),
  );

  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [issuedCreds, setIssuedCreds] = useState<{ username: string; oneTimePass: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const accessExpiresAt =
        accountType === 'TEMPORARY'
          ? new Date(Date.now() + parseInt(expiryDays, 10) * 86400000)
          : undefined;

      const optionsOffered = optionsStr.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await createExternalAccount({
        name,
        username: username.toLowerCase().trim(),
        oneTimePassword: oneTimePass,
        phone,
        categorySlug,
        optionsOffered,
        accountType,
        accessExpiresAt,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-providers'] });
      setIssuedCreds({
        username: username.toLowerCase().trim(),
        oneTimePass,
      });
      setCredentialsDialog(true);
    },
    onError: (err: any) => {
      Alert.alert('Account Creation Failed', err.response?.data?.message || err.message);
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Create External Provider Account"
          subtitle="Issue temporary or permanent access credentials"
        />
        <Card.Content style={{ gap: 12 }}>
          {}
          <View style={styles.ruleBanner}>
            <Text variant="labelSmall" style={{ color: '#E65100', fontWeight: '700' }}>
              ⚠️ SYSTEM RULES:
            </Text>
            <Text variant="bodySmall" style={{ color: '#E65100', marginTop: 2 }}>
              1. Domestic Help providers are EXTERNAL ONLY. Residents cannot register as domestic help.
            </Text>
            <Text variant="bodySmall" style={{ color: '#E65100', marginTop: 2 }}>
              2. ONE-WAY CONVERSION: Once set or converted to PERMANENT, an account can NEVER revert to TEMPORARY.
            </Text>
            <Text variant="bodySmall" style={{ color: '#E65100', marginTop: 2 }}>
              3. External providers see ONLY the Provider Portal and have zero access to resident society modules.
            </Text>
          </View>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            placeholder="e.g. Lakshmi Devi"
          />

          <TextInput
            label="Initial Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            placeholder="e.g. lakshmi_maid"
          />

          <TextInput
            label="Initial One-Time Password"
            value={oneTimePass}
            onChangeText={setOneTimePass}
            mode="outlined"
          />

          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            placeholder="10-digit mobile number"
          />

          <TextInput
            label="Category Slug"
            value={categorySlug}
            onChangeText={setCategorySlug}
            mode="outlined"
            placeholder="e.g. domestic-help, home-repair, education-tutoring"
          />

          <TextInput
            label="Options Offered (comma separated)"
            value={optionsStr}
            onChangeText={setOptionsStr}
            mode="outlined"
            placeholder="e.g. Cleaning + Utensils, Cooking"
          />

          <Text variant="labelMedium" style={{ fontWeight: '600', color: '#37474F' }}>
            Account Type
          </Text>
          <SegmentedButtons
            value={accountType}
            onValueChange={(v) => setAccountType(v as any)}
            buttons={[
              { value: 'TEMPORARY', label: 'Temporary (Expiring)' },
              { value: 'PERMANENT', label: 'Permanent' },
            ]}
          />

          {accountType === 'TEMPORARY' && (
            <TextInput
              label="Access Validity (Days from today)"
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
              mode="outlined"
            />
          )}

          <Button
            mode="contained"
            buttonColor="#512DA8"
            loading={createMutation.isPending}
            disabled={!name || !username || !phone || !oneTimePass}
            onPress={() => createMutation.mutate()}
            style={{ marginTop: 8 }}
          >
            Create External Account
          </Button>
        </Card.Content>
      </Card>

      {}
      <Portal>
        <Dialog visible={credentialsDialog} dismissable={false}>
          <Dialog.Title>Credentials Issued Successfully!</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodyMedium">
              Provide these initial login credentials to the external service provider:
            </Text>
            <View style={styles.credBox}>
              <Text variant="labelMedium" style={{ fontWeight: '700' }}>
                Username: {issuedCreds?.username}
              </Text>
              <Text variant="labelMedium" style={{ fontWeight: '700', color: '#C2185B' }}>
                One-Time Password: {issuedCreds?.oneTimePass}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              The provider will be required to change their password on first login.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              mode="contained"
              onPress={() => {
                setCredentialsDialog(false);
                router.replace('/(app)/services/admin/providers' as never);
              }}
            >
              Done & View Providers
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  ruleBanner: { backgroundColor: '#FFF3E0', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFE082' },
  credBox: { backgroundColor: '#ECEFF1', padding: 12, borderRadius: 8, gap: 4 },
});
