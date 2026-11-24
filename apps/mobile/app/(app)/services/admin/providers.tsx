import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllAdminProviders, convertExternalToPermanent } from '../../../../src/services/service-hub-admin';
import { reviewProvider } from '../../../../src/services/service-hub-providers';

export default function AdminAllProvidersScreen() {
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-all-providers'],
    queryFn: async () => {
      const res = await getAllAdminProviders();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return convertExternalToPermanent(profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-providers'] });
      Alert.alert(
        'Converted to Permanent',
        'Account converted to PERMANENT. As per society rules, this action is IRREVERSIBLE and can never be changed back to temporary.',
      );
    },
    onError: (err: any) => {
      Alert.alert('Conversion Error', err.response?.data?.message || err.message);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ profileId, action }: { profileId: string; action: 'SUSPEND' | 'ACTIVATE' }) => {
      return reviewProvider(profileId, { decision: action, notes: `President action: ${action}` });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-providers'] });
      Alert.alert('Updated', `Provider account has been ${vars.action === 'SUSPEND' ? 'suspended' : 'reactivated'}.`);
    },
  });

  const handleConvert = (p: any) => {
    Alert.alert(
      '⚠️ ONE-WAY CONVERSION RULE',
      `Converting ${p.name} to PERMANENT is a permanent, one-way change.\n\nOnce converted, this account can NEVER become TEMPORARY again. The provider will be allowed to update their username and accept long-term contracts.\n\nDo you want to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Permanent Conversion', style: 'destructive', onPress: () => convertMutation.mutate(p._id) },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Society Providers Directory</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Manage provider statuses, suspend accounts, and convert temporary external providers
        </Text>
      </View>

      {isLoading && <ActivityIndicator animating={true} style={{ marginTop: 24 }} />}

      {providers.map((p: any) => {
        const isNeighbour = p.providerType === 'INTERNAL';
        const isSuspended = p.status === 'SUSPENDED';
        const isTemporary = p.accountType === 'TEMPORARY';

        return (
          <Card key={p._id} style={styles.card} mode="elevated">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>{p.name}</Text>
                  <Text variant="bodySmall" style={{ color: isNeighbour ? '#2E7D32' : '#1565C0' }}>
                    {isNeighbour ? `🏡 Neighbour (Flat ${p.flatCode || 'Resident'})` : `👤 External (${p.accountType})`}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{
                    backgroundColor:
                      p.status === 'VERIFIED' ? '#C8E6C9' : isSuspended ? '#FFCDD2' : '#FFF9C4',
                  }}
                >
                  {p.status}
                </Chip>
              </View>

              <Divider />

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Category:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{p.categorySlug}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.label}>Rating & Trust:</Text>
                <Text variant="bodySmall">
                  ★ {p.averageRating?.toFixed(1) || '5.0'} ({p.ratingCount ?? 0} reviews) • Trust: {p.trustScore ?? 100}%
                </Text>
              </View>

              {p.accessExpiresAt && (
                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Access Expiry:</Text>
                  <Text variant="bodySmall" style={{ color: '#E65100' }}>
                    {new Date(p.accessExpiresAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.btnRow}>
                {}
                {isTemporary && (
                  <Button
                    mode="contained"
                    buttonColor="#F57F17"
                    compact
                    onPress={() => handleConvert(p)}
                  >
                    Convert to Permanent
                  </Button>
                )}

                {}
                {!isSuspended ? (
                  <Button
                    mode="outlined"
                    textColor="#D32F2F"
                    compact
                    onPress={() => suspendMutation.mutate({ profileId: p._id, action: 'SUSPEND' })}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    buttonColor="#2E7D32"
                    compact
                    onPress={() => suspendMutation.mutate({ profileId: p._id, action: 'ACTIVATE' })}
                  >
                    Reactivate
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontWeight: '700', color: '#4A148C' },
  subtitle: { color: '#6A1B9A', marginTop: 2 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#757575' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
});
