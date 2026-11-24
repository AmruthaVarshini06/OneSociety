import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Chip, Divider, HelperText } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, uploadDocument, getDocuments } from '../../../../src/services/service-hub-providers';
import { useAuthStore } from '../../../../src/store/auth';

export default function ProviderProfileEditScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [isPermanent, setIsPermanent] = useState(true);

  const [docType, setDocType] = useState('GOVERNMENT_ID');
  const [docTitle, setDocTitle] = useState('Aadhaar / National ID');
  const [docFileUrl, setDocFileUrl] = useState('https://storage.onesociety.in/docs/sample_gov_id.pdf');
  const [docExpiryDate, setDocExpiryDate] = useState('2028-12-31');

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['provider-documents', user?.userId],
    queryFn: async () => {
      if (!user) return [];
      try {
        const res = await getDocuments(user.userId);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.userId,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      return updateProfile(user.userId, {
        name,
        phone,
        bio,
        newUsername: newUsername.trim() || undefined,
        experienceYears: parseInt(experienceYears, 10) || 0,
      });
    },
    onSuccess: () => {
      Alert.alert('Profile Saved', 'Your provider profile details have been updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message);
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      return uploadDocument(user.userId, {
        docType,
        title: docTitle,
        fileUrl: docFileUrl,
        expiryDate: docExpiryDate ? new Date(docExpiryDate) : undefined,
      } as any);
    },
    onSuccess: () => {
      refetchDocs();
      Alert.alert('Document Uploaded', 'Document submitted for President verification.');
    },
    onError: (err: any) => {
      Alert.alert('Upload Error', err.response?.data?.message || err.message);
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Edit Provider Profile" subtitle="Public info visible to apartment seekers" />
        <Card.Content style={{ gap: 12 }}>
          <TextInput
            label="Full Name / Display Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
          />

          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
          />

          <TextInput
            label="Years of Experience"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
            mode="outlined"
          />

          <TextInput
            label="Short Bio / Highlights"
            value={bio}
            onChangeText={setBio}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Describe your skills, punctuality, and specialties..."
          />

          {}
          <Divider style={{ marginVertical: 4 }} />
          <Text variant="labelMedium" style={{ color: '#1565C0', fontWeight: '700' }}>
            Permanent Account Settings
          </Text>
          <TextInput
            label="Custom Username (Permanent accounts only)"
            value={newUsername}
            onChangeText={setNewUsername}
            mode="outlined"
            placeholder="e.g. ramya_cook_b102"
          />
          <HelperText type="info">
            Permanent providers can customize their login username after president verification.
          </HelperText>

          <Button
            mode="contained"
            buttonColor="#1565C0"
            loading={saveProfileMutation.isPending}
            onPress={() => saveProfileMutation.mutate()}
          >
            Save Profile
          </Button>
        </Card.Content>
      </Card>

      {}
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Verification Documents"
          subtitle="Visible ONLY to you and the Society President"
        />
        <Card.Content style={{ gap: 12 }}>
          <View style={styles.privacyBanner}>
            <Text variant="labelSmall" style={{ color: '#004D40' }}>
              🔒 Documents are strictly confidential and never visible to residents or neighbours.
            </Text>
          </View>

          {}
          {documents.map((d: any) => (
            <View key={d._id} style={styles.docItem}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>{d.title}</Text>
                <Text variant="bodySmall" style={{ color: '#757575' }}>
                  {d.docType} {d.expiryDate ? `• Exp: ${new Date(d.expiryDate).toLocaleDateString()}` : ''}
                </Text>
                {d.reviewerNote && (
                  <Text variant="labelSmall" style={{ color: '#D32F2F', marginTop: 2 }}>
                    President Note: {d.reviewerNote}
                  </Text>
                )}
              </View>
              <Chip
                compact
                style={{
                  backgroundColor:
                    d.status === 'APPROVED' ? '#C8E6C9' : d.status === 'REJECTED' ? '#FFCDD2' : '#FFF9C4',
                }}
              >
                {d.status}
              </Chip>
            </View>
          ))}

          <Divider style={{ marginVertical: 4 }} />
          <Text variant="labelMedium" style={{ fontWeight: '700' }}>Upload New Proof / Certificate</Text>

          <TextInput
            label="Document Title"
            value={docTitle}
            onChangeText={setDocTitle}
            mode="outlined"
          />

          <TextInput
            label="Document Type"
            value={docType}
            onChangeText={setDocType}
            mode="outlined"
            placeholder="GOVERNMENT_ID, CERTIFICATE, POLICE_VERIFICATION"
          />

          <TextInput
            label="Document Expiry Date (YYYY-MM-DD)"
            value={docExpiryDate}
            onChangeText={setDocExpiryDate}
            mode="outlined"
          />

          <Button
            mode="contained"
            buttonColor="#2E7D32"
            icon="file-upload"
            loading={uploadDocMutation.isPending}
            onPress={() => uploadDocMutation.mutate()}
          >
            Submit Document for Verification
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  privacyBanner: { backgroundColor: '#E0F2F1', padding: 8, borderRadius: 6 },
  docItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
});
