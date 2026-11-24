import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  TextInput,
  Portal,
  Dialog,
  ActivityIndicator,
  FAB,
  Divider,
} from 'react-native-paper';
import { getLocalVendors, createLocalVendor, updateLocalVendor } from '../../../../src/services/complaints';

export default function LocalVendorsDirectoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);

  // Add/Edit Dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await getLocalVendors();
      setVendors(res.data.vendors || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors();
  };

  const openAddDialog = () => {
    setEditingVendor(null);
    setName('');
    setPhone('');
    setTrade('');
    setNotes('');
    setDialogVisible(true);
  };

  const openEditDialog = (v: any) => {
    setEditingVendor(v);
    setName(v.name);
    setPhone(v.phone);
    setTrade(v.trade);
    setNotes(v.notes || '');
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !trade.trim()) {
      Alert.alert('Required Fields', 'Name, phone, and trade are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingVendor) {
        await updateLocalVendor(editingVendor._id, {
          name: name.trim(),
          phone: phone.trim(),
          trade: trade.trim(),
          notes: notes.trim(),
        });
        Alert.alert('Saved', 'Vendor details updated.');
      } else {
        await createLocalVendor({
          name: name.trim(),
          phone: phone.trim(),
          trade: trade.trim(),
          notes: notes.trim(),
        });
        Alert.alert('Created', 'New local vendor registered.');
      }
      setDialogVisible(false);
      fetchVendors();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.infoCard} mode="contained">
          <Card.Content>
            <Text style={styles.infoTitle}>📋 Reusable Society Vendor Directory</Text>
            <Text style={styles.infoSubtitle}>
              Vendors saved here can be immediately assigned to common area repairs when no resident ServiceHub provider is available.
            </Text>
          </Card.Content>
        </Card>

        {vendors.length === 0 ? (
          <Card style={styles.emptyCard} mode="contained">
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>No local vendors registered yet.</Text>
            </Card.Content>
          </Card>
        ) : (
          vendors.map(v => (
            <Card key={v._id} style={styles.vendorCard} mode="elevated">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.vendorName}>{v.name}</Text>
                    <Text style={styles.vendorTrade}>🛠️ {v.trade}</Text>
                  </View>
                  <Button mode="outlined" compact onPress={() => openEditDialog(v)}>
                    Edit
                  </Button>
                </View>

                <Text style={styles.vendorPhone}>📞 {v.phone}</Text>
                {v.notes ? <Text style={styles.vendorNotes}>📝 {v.notes}</Text> : null}

                <Divider style={styles.divider} />

                <View style={styles.footerRow}>
                  <Chip icon="check-all" style={styles.chipStat} compact>
                    {v.jobsCompleted || 0} jobs completed
                  </Chip>
                  <Chip style={styles.chipActive} compact>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" label="Add Vendor" style={styles.fab} onPress={openAddDialog} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingVendor ? 'Edit Vendor' : 'Add Local Vendor'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Vendor / Agency Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Trade / Specialty * (e.g. Lift maintenance, Plumber)"
              value={trade}
              onChangeText={setTrade}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Notes (rates, contacts, availability)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 14, paddingBottom: 80 },
  infoCard: { backgroundColor: '#F1F5F9', borderRadius: 10, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  infoSubtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 24 },
  emptyContent: { alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 14 },
  vendorCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  vendorName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  vendorTrade: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  vendorPhone: { fontSize: 13, color: '#475569', marginBottom: 4 },
  vendorNotes: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 6 },
  divider: { marginVertical: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipStat: { backgroundColor: '#F0FDF4', height: 26 },
  chipActive: { height: 26 },
  dialogInput: { backgroundColor: '#FFFFFF', marginBottom: 8 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: '#2563EB' },
});
