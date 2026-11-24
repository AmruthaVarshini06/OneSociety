import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../src/services/notifications';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTypeIcon(type: string): string {
  if (type.includes('DELIVERY') || type.includes('PASS') || type.includes('GATE')) return '📦';
  if (type.includes('PAYMENT') || type.includes('ESCROW')) return '💳';
  if (type.includes('ISSUE') || type.includes('DISPUTE')) return '⚠️';
  if (type.includes('RENTAL') || type.includes('BOOKING') || type.includes('EXTENSION')) return '🔄';
  return '📢';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', filterUnreadOnly],
    queryFn: () => getNotifications({ isRead: filterUnreadOnly ? false : undefined }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationPress = (notif: AppNotification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif._id);
    }
    if (notif.referenceId) {
      const t = notif.type;
      if (t.includes('DISPUTE_ESCALATED') || t.includes('PRESIDENT_RULING')) {
        router.push(`/(app)/rentals/admin/disputes` as never);
      } else if (
        t.includes('BOOKING') ||
        t.includes('RENTAL_') ||
        t.includes('EXTENSION') ||
        t.includes('OVERTIME') ||
        t.includes('DISPUTE')
      ) {
        router.push(`/(app)/rentals/bookings/${notif.referenceId}` as never);
      } else if (t.includes('ITEM_REQUEST') || t.includes('OFFER')) {
        router.push(`/(app)/rentals` as never);
      } else {
        router.push(`/(app)/group-orders/${notif.referenceId}` as never);
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtext}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {}
        <View style={styles.topBar}>
          <View style={styles.filterRow}>
            <Chip
              selected={!filterUnreadOnly}
              onPress={() => setFilterUnreadOnly(false)}
              style={[styles.chip, !filterUnreadOnly && styles.chipActive]}
            >
              All ({data?.total ?? 0})
            </Chip>
            <Chip
              selected={filterUnreadOnly}
              onPress={() => setFilterUnreadOnly(true)}
              style={[styles.chip, filterUnreadOnly && styles.chipActive]}
            >
              Unread ({unreadCount})
            </Chip>
          </View>

          {unreadCount > 0 && (
            <Button
              mode="text"
              compact
              loading={markAllReadMutation.isPending}
              onPress={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </View>

        {isError && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.errorText}>Failed to load notifications.</Text>
              <Button mode="outlined" onPress={() => refetch()} style={{ marginTop: 8 }}>
                Retry
              </Button>
            </Card.Content>
          </Card>
        )}

        {}
        {notifications.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔔</Text>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                No Notifications
              </Text>
              <Text style={[styles.subtext, { textAlign: 'center', marginTop: 4 }]}>
                {filterUnreadOnly
                  ? 'You have caught up with all your notifications!'
                  : 'Group buying updates, delivery alerts, and society broadcasts will appear here.'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          notifications.map((notif) => {
            const icon = getTypeIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif._id}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.8}
              >
                <Card
                  style={[
                    styles.notifCard,
                    !notif.isRead && styles.unreadCard,
                  ]}
                >
                  <Card.Content>
                    <View style={styles.row}>
                      <View style={styles.titleRow}>
                        <Text style={styles.typeIcon}>{icon}</Text>
                        <Text
                          variant="titleSmall"
                          style={[styles.title, !notif.isRead && styles.unreadTitle]}
                          numberOfLines={1}
                        >
                          {notif.title}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        {!notif.isRead && <View style={styles.unreadDot} />}
                        <Text style={styles.timeText}>
                          {formatRelativeTime(notif.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.bodyText, !notif.isRead && styles.unreadBody]}>
                      {notif.body}
                    </Text>

                    {notif.referenceId && (
                      <Text style={styles.tapNotice}>Tap to view group order &rarr;</Text>
                    )}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#E0E0E0' },
  chipActive: { backgroundColor: '#BBDEFB' },
  card: { backgroundColor: '#FFFFFF', marginBottom: 12 },
  notifCard: { backgroundColor: '#FFFFFF', marginBottom: 10, borderRadius: 8 },
  unreadCard: { backgroundColor: '#F0F7FF', borderColor: '#90CAF9', borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  typeIcon: { fontSize: 18, marginRight: 8 },
  title: { fontWeight: '600', color: '#424242', flex: 1 },
  unreadTitle: { fontWeight: 'bold', color: '#0D47A1' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1976D2' },
  timeText: { fontSize: 11, color: '#757575' },
  bodyText: { color: '#616161', fontSize: 13, lineHeight: 18 },
  unreadBody: { color: '#212121' },
  tapNotice: { fontSize: 11, color: '#1565C0', marginTop: 6, fontWeight: '500' },
  subtext: { color: '#757575', fontSize: 13 },
  errorText: { color: '#C62828', fontSize: 14 },
  emptyContent: { alignItems: 'center', paddingVertical: 32 },
});
