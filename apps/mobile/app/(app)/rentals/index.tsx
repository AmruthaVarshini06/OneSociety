import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  Button,
  ActivityIndicator,
  Badge,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/auth';
import {
  getCatalog,
  listRentalItems,
  type RentalCatalogCategory,
  type RentalItem,
} from '../../../src/services/rentals';

export default function RentalsHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Queries
  const {
    data: catalog = [],
    isLoading: isCatalogLoading,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['rentals-catalog'],
    queryFn: getCatalog,
  });

  const {
    data: itemsData,
    isLoading: isItemsLoading,
    refetch: refetchItems,
    isRefetching,
  } = useQuery({
    queryKey: ['rentals-items', selectedCategory, searchQuery],
    queryFn: () =>
      listRentalItems({
        category: selectedCategory ?? undefined,
        search: searchQuery.trim() || undefined,
      }),
  });

  const onRefresh = () => {
    refetchCatalog();
    refetchItems();
  };

  const isPresident = user?.role === 'president';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search and Navigation Bar */}
      <View style={styles.header}>
        <Searchbar
          placeholder="Search tools, gear, vessels..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            icon="plus"
            compact
            onPress={() => router.push('/(app)/rentals/create' as never)}
            style={styles.actionBtn}
          >
            List Item
          </Button>
          <Button
            mode="outlined"
            icon="hand-wave"
            compact
            onPress={() => router.push('/(app)/rentals/requests' as never)}
            style={styles.actionBtn}
          >
            Requests
          </Button>
          <Button
            mode="outlined"
            icon="format-list-bulleted"
            compact
            onPress={() => router.push('/(app)/rentals/my-items' as never)}
            style={styles.actionBtn}
          >
            My Items
          </Button>
          <Button
            mode="outlined"
            icon="calendar-check"
            compact
            onPress={() => router.push('/(app)/rentals/bookings' as never)}
            style={styles.actionBtn}
          >
            Bookings
          </Button>
          {isPresident && (
            <>
              <Button
                mode="contained-tonal"
                icon="shield-check"
                compact
                onPress={() => router.push('/(app)/rentals/admin/reviews' as never)}
                style={styles.actionBtn}
              >
                Reviews
              </Button>
              <Button
                mode="contained-tonal"
                icon="gavel"
                compact
                onPress={() => router.push('/(app)/rentals/admin/disputes' as never)}
                style={styles.actionBtn}
              >
                Disputes
              </Button>
            </>
          )}
        </View>
      </View>

      <FlatList
        data={itemsData?.items || []}
        keyExtractor={(item, idx) => item._id || (item as any).id || String(idx)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Neighbours Wanted Banner */}
            <TouchableOpacity
              style={styles.wantedBanner}
              onPress={() => router.push('/(app)/rentals/requests' as never)}
            >
              <IconButton icon="magnify" size={22} iconColor="#1565C0" style={{ margin: 0 }} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={styles.wantedTitle}>
                  Neighbours Looking to Borrow
                </Text>
                <Text variant="bodySmall" style={styles.wantedSub}>
                  View community requests · Lend items you own
                </Text>
              </View>
              <IconButton icon="chevron-right" size={20} iconColor="#1565C0" style={{ margin: 0 }} />
            </TouchableOpacity>

            {/* Catalog Categories Section */}
            <View style={styles.catalogSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Popular Shareable Items
              </Text>
              <Text variant="bodySmall" style={styles.sectionSubtitle}>
                Rent what you need from neighbours in your society
              </Text>

              {isCatalogLoading ? (
                <ActivityIndicator style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    style={[
                      styles.categoryCard,
                      selectedCategory === null && styles.categoryCardSelected,
                    ]}
                  >
                    <IconButton
                      icon="apps"
                      size={24}
                      iconColor={selectedCategory === null ? '#1565C0' : '#757575'}
                    />
                    <Text
                      variant="labelMedium"
                      style={[
                        styles.categoryName,
                        selectedCategory === null && styles.categoryNameSelected,
                      ]}
                    >
                      All Items
                    </Text>
                  </TouchableOpacity>

                  {catalog.map((cat, idx) => {
                    const isSelected = selectedCategory === cat.slug;
                    return (
                      <TouchableOpacity
                        key={cat._id || (cat as any).id || cat.slug || String(idx)}
                        onPress={() => setSelectedCategory(isSelected ? null : cat.slug)}
                        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                      >
                        <View style={styles.badgeWrapper}>
                          <IconButton
                            icon={cat.icon || 'cube-outline'}
                            size={24}
                            iconColor={isSelected ? '#1565C0' : '#424242'}
                          />
                          {cat.availableCount > 0 && (
                            <Badge style={styles.countBadge}>{cat.availableCount}</Badge>
                          )}
                        </View>
                        <Text
                          variant="labelMedium"
                          numberOfLines={1}
                          style={[
                            styles.categoryName,
                            isSelected && styles.categoryNameSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                        <Text variant="bodySmall" style={styles.availableLabel}>
                          {cat.availableCount} available
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Listings Header */}
            <View style={styles.listHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {selectedCategory
                  ? `${catalog.find((c) => c.slug === selectedCategory)?.name || selectedCategory} Listings`
                  : 'Available in Society'}
              </Text>
              <Text variant="bodySmall" style={styles.resultCount}>
                {itemsData?.total || 0} items
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <RentalItemCard item={item} />}
        ListEmptyComponent={
          isItemsLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <IconButton icon="package-variant-closed" size={48} iconColor="#BDBDBD" />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No listings found
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                {selectedCategory
                  ? 'No neighbour has listed this item yet. Be the first to share one!'
                  : 'No items currently match your search.'}
              </Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => router.push('/(app)/rentals/create' as never)}
                style={{ marginTop: 16 }}
              >
                List an Item
              </Button>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

function RentalItemCard({ item }: { item: RentalItem }) {
  const flatNumber =
    typeof item.flatId === 'object' && item.flatId ? item.flatId.number : item.pickupLocation;

  return (
    <Card
      style={styles.card}
      mode="elevated"
      onPress={() => router.push(`/(app)/rentals/${item._id}` as never)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.itemTitle}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.itemCategory}>
              {item.category.toUpperCase()} • Flat {flatNumber}
            </Text>
          </View>

          {item.aiPriceVerification?.verdict === 'FAIR' && (
            <Chip
              icon="check-decagram"
              compact
              textStyle={styles.aiBadgeText}
              style={styles.aiBadge}
            >
              Price verified by AI
            </Chip>
          )}
        </View>

        <Text variant="bodyMedium" numberOfLines={2} style={styles.itemDesc}>
          {item.description}
        </Text>

        <View style={styles.pricingRow}>
          <View style={styles.ratePills}>
            {item.chargeHourlyPaise ? (
              <Chip icon="clock-outline" compact style={styles.rateChip}>
                ₹{(item.chargeHourlyPaise / 100).toFixed(0)}/hr
              </Chip>
            ) : null}
            {item.chargeDailyPaise ? (
              <Chip icon="calendar-outline" compact style={styles.rateChip}>
                ₹{(item.chargeDailyPaise / 100).toFixed(0)}/day
              </Chip>
            ) : null}
          </View>

          <View style={styles.depositInfo}>
            <Text variant="bodySmall" style={styles.depositLabel}>
              Deposit: ₹{(item.safeDepositPaise / 100).toFixed(0)}
            </Text>
            <Text variant="labelSmall" style={styles.refundableLabel}>
              (100% Refundable)
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchbar: {
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    height: 44,
  },
  searchInput: {
    minHeight: 44,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionBtn: {
    borderRadius: 6,
  },
  wantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    borderBottomWidth: 1,
    borderBottomColor: '#90CAF9',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  wantedTitle: { fontWeight: '700', color: '#1565C0' },
  wantedSub: { color: '#1976D2', marginTop: 1 },
  catalogSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#212121',
  },
  sectionSubtitle: {
    color: '#757575',
    marginBottom: 10,
  },
  categoryScroll: {
    gap: 10,
    paddingRight: 16,
  },
  categoryCard: {
    width: 105,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
  },
  badgeWrapper: {
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#2E7D32',
    fontSize: 10,
  },
  categoryName: {
    fontWeight: '600',
    color: '#424242',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#1565C0',
  },
  availableLabel: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultCount: {
    color: '#757575',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontWeight: '700',
    color: '#212121',
  },
  itemCategory: {
    color: '#757575',
    marginTop: 2,
    fontWeight: '500',
  },
  aiBadge: {
    backgroundColor: '#E8F5E9',
  },
  aiBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  itemDesc: {
    color: '#616161',
    marginVertical: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  ratePills: {
    flexDirection: 'row',
    gap: 6,
  },
  rateChip: {
    backgroundColor: '#E3F2FD',
  },
  depositInfo: {
    alignItems: 'flex-end',
  },
  depositLabel: {
    fontWeight: '600',
    color: '#424242',
  },
  refundableLabel: {
    color: '#2E7D32',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontWeight: '600',
    color: '#616161',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4,
  },
});
