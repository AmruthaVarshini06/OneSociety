import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchFlatPresence, type FlatPresenceDto } from '../../../src/services/society-help';

export default function FlatSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FlatPresenceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (val?: string) => {
    const q = (val !== undefined ? val : query).trim();
    if (!q) return;

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await searchFlatPresence(q);
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.privacyBanner}>
        <MaterialCommunityIcons name="shield-check" size={20} color="#1E3A8A" />
        <Text style={styles.privacyText}>
          Privacy Protected: Displays ONLY presence status and timestamp. Strictly no resident
          names or phone numbers.
        </Text>
      </View>

      {}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Type Flat (e.g. A-101, B, 202)..."
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            if (v.length >= 2) handleSearch(v);
          }}
          onSubmitEditing={() => handleSearch()}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()}>
          <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {}
      <View style={styles.blockRow}>
        {['All', 'Block A', 'Block B', 'Block C', 'Block D'].map((b) => (
          <TouchableOpacity
            key={b}
            style={styles.blockPill}
            onPress={() => {
              const q = b === 'All' ? ' ' : b.replace('Block ', '');
              setQuery(q);
              handleSearch(q);
            }}
          >
            <Text style={styles.blockPillText}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={results}
          keyExtractor={(item) => item.flatCode}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="home-alert" size={40} color="#94A3B8" />
                <Text style={styles.emptyText}>No matching flats found</Text>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="home-search" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Search a flat number to view presence status</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const isPresent = item.status === 'PRESENT';
            return (
              <View
                style={[
                  styles.card,
                  isPresent ? styles.cardPresent : styles.cardNotPresent,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.flatCodeText}>Flat {item.flatCode}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isPresent ? styles.badgePresent : styles.badgeNotPresent,
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isPresent ? '#16A34A' : '#DC2626' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isPresent ? '#15803D' : '#991B1B' },
                      ]}
                    >
                      {isPresent ? 'PRESENT' : 'NOT PRESENT'}
                    </Text>
                  </View>
                </View>

                {item.activeEventTitle ? (
                  <View style={styles.eventNotice}>
                    <MaterialCommunityIcons name="party-popper" size={16} color="#B45309" />
                    <Text style={styles.eventNoticeText}>
                      Active Event: {item.activeEventTitle} (Counts as Present)
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" />
                  <Text style={styles.timeLabel}>
                    Updated: {item.lastUpdated || 'Not set recently'}
                  </Text>
                </View>

                {item.isStale ? (
                  <View style={styles.staleWarning}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#D97706" />
                    <Text style={styles.staleText}>Status not updated in &gt; 24 hrs</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    gap: 8,
  },
  privacyText: { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 16, fontWeight: '600' },
  searchBox: { flexDirection: 'row', padding: 16, gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBtn: {
    backgroundColor: '#1E3A8A',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  blockPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  blockPillText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  cardPresent: { borderColor: '#BBF7D0' },
  cardNotPresent: { borderColor: '#FECACA' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flatCodeText: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgePresent: { backgroundColor: '#DCFCE7' },
  badgeNotPresent: { backgroundColor: '#FEE2E2' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  eventNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  eventNoticeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  timeLabel: { fontSize: 12, color: '#64748B' },
  staleWarning: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  staleText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
});
