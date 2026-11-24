import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getMaintenanceAccounts,
  getExpenseQueries,
  replyExpenseQuery,
} from '../../../../src/services/society-help';
import { useFocusEffect } from 'expo-router';

export default function PresidentQueriesScreen() {
  const [entriesWithQueries, setEntriesWithQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const accRes = await getMaintenanceAccounts();
      const entries = accRes.data.entries || [];

      // Fetch queries for each entry
      const results: any[] = [];
      for (const entry of entries) {
        try {
          const qRes = await getExpenseQueries(entry._id);
          if (qRes.data && qRes.data.length > 0) {
            results.push({
              entry,
              queries: qRes.data,
            });
          }
        } catch {
          // ignore
        }
      }
      setEntriesWithQueries(results);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleReply = async (queryId: string) => {
    const answer = replyTextMap[queryId]?.trim();
    if (!answer) {
      Alert.alert('Required', 'Please type a reply message.');
      return;
    }

    try {
      setReplyingId(queryId);
      await replyExpenseQuery(queryId, answer);
      Alert.alert('Reply Sent', 'Your reply is now published publicly on this expense.');
      setReplyTextMap((prev) => ({ ...prev, [queryId]: '' }));
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send reply.');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Resident Expense Inquiries</Text>
      <Text style={styles.subtitle}>
        Provide transparent official answers to resident questions regarding society expenditures.
      </Text>

      {loading ? (
        <ActivityIndicator color="#1E3A8A" style={{ marginTop: 40 }} />
      ) : entriesWithQueries.length > 0 ? (
        entriesWithQueries.map(({ entry, queries }) => (
          <View key={entry._id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryCat}>{entry.category}</Text>
              <Text style={styles.entryAmount}>
                ₹{(entry.amountPaise / 100).toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={styles.entryDesc}>{entry.description}</Text>

            {/* Queries on this entry */}
            {queries.map((q: any) => {
              const isReplying = replyingId === q._id;
              return (
                <View key={q._id} style={styles.qBox}>
                  <Text style={styles.qText}>❓ Question: {q.question}</Text>
                  <Text style={styles.qMeta}>
                    Asked on {new Date(q.createdAt).toLocaleDateString()}
                  </Text>

                  {q.answer ? (
                    <View style={styles.aBox}>
                      <Text style={styles.aText}>🛡️ President Official Reply:</Text>
                      <Text style={styles.aBody}>{q.answer}</Text>
                    </View>
                  ) : (
                    <View style={styles.replyForm}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Type official reply to resident..."
                        value={replyTextMap[q._id] || ''}
                        onChangeText={(v) =>
                          setReplyTextMap((prev) => ({ ...prev, [q._id]: v }))
                        }
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.replyBtn}
                        onPress={() => handleReply(q._id)}
                        disabled={isReplying}
                      >
                        {isReplying ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.replyBtnText}>Publish Reply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="comment-check" size={48} color="#16A34A" />
          <Text style={styles.emptyText}>No pending resident questions!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryCat: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  entryAmount: { fontSize: 16, fontWeight: '900', color: '#DC2626' },
  entryDesc: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 12 },
  qBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  qMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  aBox: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 8 },
  aText: { fontSize: 11, fontWeight: '800', color: '#1E40AF' },
  aBody: { fontSize: 13, color: '#1E3A8A', marginTop: 3 },
  replyForm: { marginTop: 10 },
  replyInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    height: 60,
    textAlignVertical: 'top',
  },
  replyBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  replyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#15803D' },
});
