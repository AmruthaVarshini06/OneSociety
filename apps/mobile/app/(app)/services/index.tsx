import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Searchbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { listCategories } from '../../../src/services/service-hub-admin';
import { useAuthStore } from '../../../src/store/auth';

const CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'domestic-help': 'broom',
  'education-tutoring': 'school',
  'music-dance': 'music-clef-treble',
  'home-repair': 'wrench',
  'fitness-wellness': 'dumbbell',
  'beauty-care': 'content-cut',
};

const DEFAULT_CATEGORIES = [
  {
    _id: '1',
    name: 'Domestic Help (Maids & Cooks)',
    slug: 'domestic-help',
    description: 'Cleaning, utensils washing, daily cooking. Verified outsiders only.',
    isDomesticHelp: true,
    options: [{ name: 'Cleaning + Washing Utensils' }, { name: 'Cleaning + Washing + Cooking' }],
  },
  {
    _id: '2',
    name: 'Education & Tutoring',
    slug: 'education-tutoring',
    description: 'School tuition, classes 11-12, coding & languages by neighbours & tutors.',
    isDomesticHelp: false,
    options: [{ name: 'School Tuition (1-10)' }, { name: 'High Secondary (11-12)' }, { name: 'Coding' }, { name: 'Languages' }],
  },
  {
    _id: '3',
    name: 'Music & Dance',
    slug: 'music-dance',
    description: 'Singing, guitar, keyboard, classical and western dance lessons.',
    isDomesticHelp: false,
    options: [{ name: 'Singing' }, { name: 'Musical Instruments' }, { name: 'Classical Dance' }, { name: 'Western Dance' }],
  },
  {
    _id: '4',
    name: 'Home Repair & Maintenance',
    slug: 'home-repair',
    description: 'Electrician, plumber, carpenter, AC & home appliance servicing.',
    isDomesticHelp: false,
    options: [{ name: 'Electrician' }, { name: 'Plumber' }, { name: 'Carpenter' }, { name: 'AC & Appliance Repair' }],
  },
  {
    _id: '5',
    name: 'Fitness & Wellness',
    slug: 'fitness-wellness',
    description: 'Yoga instructor, personal gym trainer, zumba for society members.',
    isDomesticHelp: false,
    options: [{ name: 'Yoga Instructor' }, { name: 'Fitness Trainer' }, { name: 'Zumba Instructor' }],
  },
  {
    _id: '6',
    name: 'Beauty & Personal Care',
    slug: 'beauty-care',
    description: 'Salon at home: beautician, makeup artist, mehendi, hair styling.',
    isDomesticHelp: false,
    options: [{ name: 'Beautician' }, { name: 'Makeup Artist' }, { name: 'Mehendi Artist' }, { name: 'Hair Stylist' }],
  },
];

export default function ServiceHubHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const { data: categories = DEFAULT_CATEGORIES, isLoading, refetch } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      try {
        const res = await listCategories();
        return res.data && res.data.length > 0 ? res.data : DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
  });

  const filtered = categories.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const isProvider = user?.role === 'provider_internal' || user?.role === 'provider_external';
  const isPresident = user?.role === 'president';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>ServiceHub</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Skills Marketplace: Verified neighbours & trusted service professionals
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Button
          mode="contained"
          icon="calendar-check"
          style={styles.actionBtn}
          onPress={() => router.push('/(app)/services/my-services' as never)}
        >
          My Services
        </Button>
        {isProvider ? (
          <Button
            mode="outlined"
            icon="briefcase"
            style={styles.actionBtn}
            onPress={() => router.push('/(app)/services/provider-portal' as never)}
          >
            Provider Portal
          </Button>
        ) : (
          <Button
            mode="outlined"
            icon="account-plus"
            style={styles.actionBtn}
            onPress={() => router.push('/(app)/services/provider-portal/profile' as never)}
          >
            Offer a Skill
          </Button>
        )}
      </View>

      {isPresident && (
        <Card style={[styles.card, styles.adminCard]} mode="elevated">
          <Card.Content>
            <View style={styles.badgeRow}>
              <Chip icon="shield-crown" style={styles.presidentChip}>President Tools</Chip>
            </View>
            <Text variant="titleMedium" style={styles.adminTitle}>Manage Society ServiceHub</Text>
            <Text variant="bodySmall" style={styles.adminSubtitle}>
              Verify documents, issue temporary credentials, handle complaints & audit reports.
            </Text>
            <Button
              mode="contained"
              buttonColor="#6A1B9A"
              style={{ marginTop: 10 }}
              onPress={() => router.push('/(app)/services/admin' as never)}
            >
              Open President Dashboard
            </Button>
          </Card.Content>
        </Card>
      )}

      <Searchbar
        placeholder="Search maids, tutors, repairs..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>Browse Categories</Text>

      {filtered.map((cat: any) => {
        const iconName = CATEGORY_ICONS[cat.slug] ?? 'briefcase-outline';
        return (
          <Card
            key={cat._id || cat.slug}
            style={styles.card}
            mode="elevated"
            onPress={() => router.push(`/(app)/services/category/${cat.slug}` as never)}
          >
            <Card.Content>
              <View style={styles.catHeader}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name={iconName} size={28} color={theme.colors.primary} />
                </View>
                <View style={styles.catTextWrap}>
                  <Text variant="titleMedium" style={styles.catName}>{cat.name}</Text>
                  {cat.isDomesticHelp ? (
                    <Chip compact textStyle={{ fontSize: 10 }} style={styles.externalChip}>
                      External Outsiders Only
                    </Chip>
                  ) : (
                    <Chip compact textStyle={{ fontSize: 10 }} style={styles.neighbourChip}>
                      Neighbours & Outsiders
                    </Chip>
                  )}
                </View>
              </View>
              <Text variant="bodySmall" style={styles.catDesc} numberOfLines={2}>
                {cat.description}
              </Text>
              {cat.options && (
                <View style={styles.optionsWrap}>
                  {cat.options.slice(0, 3).map((opt: any, idx: number) => (
                    <Chip key={idx} compact style={styles.optChip}>
                      {opt.name}
                    </Chip>
                  ))}
                  {cat.options.length > 3 && (
                    <Text variant="labelSmall" style={styles.moreText}>
                      +{cat.options.length - 3} more
                    </Text>
                  )}
                </View>
              )}
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
  title: { fontWeight: '700', color: '#1A237E' },
  subtitle: { color: '#546E7A', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 8 },
  searchbar: { backgroundColor: '#ffffff', elevation: 2, borderRadius: 10 },
  sectionTitle: { fontWeight: '600', color: '#263238', marginTop: 8 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', elevation: 2 },
  adminCard: { backgroundColor: '#F3E5F5', borderColor: '#BA68C8', borderWidth: 1 },
  badgeRow: { flexDirection: 'row', marginBottom: 4 },
  presidentChip: { backgroundColor: '#E1BEE7' },
  adminTitle: { fontWeight: '700', color: '#4A148C' },
  adminSubtitle: { color: '#6A1B9A', marginTop: 2 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  catTextWrap: { flex: 1 },
  catName: { fontWeight: '700', color: '#212121' },
  externalChip: { alignSelf: 'flex-start', backgroundColor: '#FFF3E0', marginTop: 2 },
  neighbourChip: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', marginTop: 2 },
  catDesc: { color: '#616161', marginTop: 8 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  optChip: { backgroundColor: '#ECEFF1' },
  moreText: { color: '#78909C', fontWeight: '500' },
});
