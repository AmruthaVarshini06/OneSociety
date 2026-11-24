import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { getMyProviderPass, type QrPassDto } from '../../../src/services/society-help';
import { QrCodeDisplay } from '../../../src/components/QrCodeDisplay';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProviderHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const isInternal = user?.role === 'provider_internal';

  const [providerPass, setProviderPass] = useState<QrPassDto | null>(null);
  const [loadingPass, setLoadingPass] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);

  const handleOpenGatePass = async () => {
    try {
      setLoadingPass(true);
      const res = await getMyProviderPass();
      setProviderPass(res.data);
      setPassModalVisible(true);
    } catch {
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineMedium" style={styles.title}>
          Provider Workspace
        </Text>

        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Service Provider
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {isInternal
                ? 'Internal Resident Provider (You can switch between Seeker and Provider views)'
                : 'External Society Service Provider'}
            </Text>
          </Card.Content>
          <Card.Actions style={{ flexDirection: 'column', gap: 8, width: '100%' }}>
            <Button
              mode="contained"
              buttonColor="#1565C0"
              style={{ width: '100%' }}
              onPress={() => router.push('/(app)/services/provider-portal' as never)}
            >
              Open Provider Portal & Today's Schedule
            </Button>

            <Button
              mode="contained"
              buttonColor="#1E3A8A"
              icon="qrcode-scan"
              style={{ width: '100%' }}
              onPress={handleOpenGatePass}
              loading={loadingPass}
            >
              My Society Gate QR Pass
            </Button>

            {isInternal && (
              <Button
                mode="outlined"
                style={{ width: '100%' }}
                onPress={() => router.push('/(app)/home/resident' as never)}
              >
                Switch to Resident Home
              </Button>
            )}
          </Card.Actions>
        </Card>

        {}
        <Modal visible={passModalVisible} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Security Gate QR Pass</Text>
                <TouchableOpacity onPress={() => setPassModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {providerPass ? (
                <>
                  <Text style={styles.passSub}>
                    {providerPass.ownerName} • {providerPass.serviceCategory || 'Service Provider'}
                  </Text>
                  <QrCodeDisplay
                    code={providerPass.passCode}
                    size={180}
                    sublabel="Show to security guard at gate. Shows your daily ServiceHub schedule."
                  />
                  <View style={styles.statsRow}>
                    <Text style={styles.statLabel}>
                      Entered: {providerPass.peopleEnteredTotal} • Exited:{' '}
                      {providerPass.peopleExitedTotal} • Inside Society:{' '}
                      <Text style={{ fontWeight: '800', color: '#16A34A' }}>
                        {providerPass.peopleCurrentlyInside}
                      </Text>
                    </Text>
                  </View>
                </>
              ) : (
                <ActivityIndicator color="#1E3A8A" />
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flexGrow: 1, padding: 16, gap: 12 },
  title: { fontWeight: 'bold', color: '#1565C0', marginBottom: 8 },
  card: { borderRadius: 12, backgroundColor: '#ffffff' },
  cardContent: { paddingBottom: 8 },
  cardTitle: { fontWeight: '600', color: '#212121' },
  subtitle: { color: '#757575', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  passSub: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 12 },
  statsRow: { marginTop: 12 },
  statLabel: { fontSize: 12, color: '#475569' },
});
