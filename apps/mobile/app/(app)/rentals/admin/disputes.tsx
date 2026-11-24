import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  TextInput,
  Dialog,
  Portal,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPendingDisputes,
  resolveDisputeByPresident,
  type RentalDispute,
} from '../../../../src/services/rental-disputes';

export default function PresidentDisputesScreen() {
  const queryClient = useQueryClient();

  const [selectedDispute, setSelectedDispute] = useState<RentalDispute | null>(null);
  const [rulingDialogVisible, setRulingDialogVisible] = useState(false);
  const [ownerAwardRs, setOwnerAwardRs] = useState('');
  const [renterRefundRs, setRenterRefundRs] = useState('');
  const [rulingReason, setRulingReason] = useState('');

  const { data: disputes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pending-disputes'],
    queryFn: listPendingDisputes,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      bookingId,
      ownerAmountPaise,
      renterRefundPaise,
      decisionReason,
    }: {
      bookingId: string;
      ownerAmountPaise: number;
      renterRefundPaise: number;
      decisionReason: string;
    }) =>
      resolveDisputeByPresident(bookingId, {
        ownerAmountPaise,
        renterRefundPaise,
        decisionReason,
      }),
    onSuccess: () => {
      setRulingDialogVisible(false);
      setSelectedDispute(null);
      setOwnerAwardRs('');
      setRenterRefundRs('');
      setRulingReason('');
      queryClient.invalidateQueries({ queryKey: ['pending-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert('Ruling Issued', 'Dispute decided and escrow funds released according to your ruling.');
    },
    onError: (err: unknown) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Ruling failed');
    },
  });

  const openRulingDialog = (dispute: RentalDispute) => {
    setSelectedDispute(dispute);
    const claimRs = Math.round(dispute.claimedAmountPaise / 100);
    setOwnerAwardRs(String(claimRs));
    setRenterRefundRs('0');
    setRulingReason('');
    setRulingDialogVisible(true);
  };

  const handleExecuteRuling = () => {
    if (!selectedDispute) return;
    const bookingId =
      typeof selectedDispute.bookingId === 'object'
        ? selectedDispute.bookingId._id
        : selectedDispute.bookingId;

    const ownerPaise = Math.round(parseFloat(ownerAwardRs || '0') * 100);
    const renterPaise = Math.round(parseFloat(renterRefundRs || '0') * 100);

    if (!rulingReason.trim()) {
      Alert.alert('Required', 'Please enter a justification reason for your ruling.');
      return;
    }

    resolveMutation.mutate({
      bookingId,
      ownerAmountPaise: ownerPaise,
      renterRefundPaise: renterPaise,
      decisionReason: rulingReason.trim(),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={disputes}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.headerTitle}>
              Dispute Resolution Queue
            </Text>
            <Text variant="bodySmall" style={styles.headerSub}>
              Review contested item damage claims, inspect photo proof, and issue binding escrow split rulings.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="titleMedium" style={{ color: '#757575' }}>
              No Pending Disputes
            </Text>
            <Text variant="bodySmall" style={{ color: '#9E9E9E', marginTop: 4 }}>
              All society rental transactions are peaceful and settled!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ownerName =
            typeof item.ownerId === 'object' ? item.ownerId.username : 'Owner';
          const renterName =
            typeof item.renterId === 'object' ? item.renterId.username : 'Renter';
          const itemName =
            typeof item.bookingId === 'object' && item.bookingId?.itemId?.name
              ? item.bookingId.itemId.name
              : 'Rental Item';

          return (
            <Card style={styles.card} mode="outlined">
              <Card.Content style={{ gap: 8 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                      {itemName}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#757575' }}>
                      {renterName} (Renter) ↔ {ownerName} (Owner)
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{
                      backgroundColor: item.status === 'ESCALATED' ? '#FFCDD2' : '#FFF9C4',
                    }}
                  >
                    {item.status}
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 4 }} />

                <View style={styles.row}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Category:</Text>
                  <Chip compact>{item.issueCategory.replace(/_/g, ' ')}</Chip>
                </View>

                <View style={styles.row}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Claimed Amount:</Text>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: '#C62828' }}>
                    ₹{(item.claimedAmountPaise / 100).toFixed(0)}
                  </Text>
                </View>

                <View style={styles.box}>
                  <Text variant="bodySmall" style={{ fontWeight: '700', color: '#424242' }}>
                    Owner's Claim Description:
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#616161', marginTop: 2 }}>
                    "{item.ownerDescription}"
                  </Text>
                </View>

                {item.renterCounterNote ? (
                  <View style={[styles.box, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: '#1565C0' }}>
                      Renter's Counter Explanation:
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#0D47A1', marginTop: 2 }}>
                      "{item.renterCounterNote}"
                    </Text>
                  </View>
                ) : null}

                {}
                {item.ownerEvidencePhotos && item.ownerEvidencePhotos.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text variant="labelSmall" style={{ color: '#757575', marginBottom: 4 }}>
                      Evidence Photos:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {item.ownerEvidencePhotos.map((url, idx) => (
                        <Image key={idx} source={{ uri: url }} style={styles.evidencePhoto} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Button
                  mode="contained"
                  buttonColor="#1565C0"
                  icon="gavel"
                  style={{ marginTop: 6 }}
                  onPress={() => openRulingDialog(item)}
                >
                  Make Binding Ruling
                </Button>
              </Card.Content>
            </Card>
          );
        }}
      />

      {}
      <Portal>
        <Dialog visible={rulingDialogVisible} onDismiss={() => setRulingDialogVisible(false)}>
          <Dialog.Title>President Binding Ruling</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodySmall" style={{ color: '#616161' }}>
              Specify the escrow distribution. Funds will be immediately released to the owner and refunded to the renter.
            </Text>

            <TextInput
              label="Award to Owner (₹)"
              value={ownerAwardRs}
              onChangeText={setOwnerAwardRs}
              keyboardType="number-pad"
              mode="outlined"
            />

            <TextInput
              label="Refund to Renter (₹)"
              value={renterRefundRs}
              onChangeText={setRenterRefundRs}
              keyboardType="number-pad"
              mode="outlined"
            />

            <TextInput
              label="Decision Justification"
              value={rulingReason}
              onChangeText={setRulingReason}
              multiline
              numberOfLines={3}
              mode="outlined"
              placeholder="e.g. Damage verified from return photo #2; partial deduction justified."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRulingDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#1565C0"
              loading={resolveMutation.isPending}
              disabled={resolveMutation.isPending}
              onPress={handleExecuteRuling}
            >
              Execute Ruling
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 8 },
  headerTitle: { fontWeight: '800', color: '#1565C0' },
  headerSub: { color: '#757575', marginTop: 2 },
  empty: { padding: 48, alignItems: 'center' },
  card: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  box: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  evidencePhoto: {
    width: 90,
    height: 70,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
});
