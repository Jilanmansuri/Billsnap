import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBill } from '@/context/BillContext';
import { Header } from '@/components/common/Header';
import { BillCard } from '@/components/common/BillCard';
import { fetchBills } from '@/services/billApi';
import { BillData, BillSortOption, PaginationMeta } from '@/types/bill';

export default function HistoryScreen() {
  const router = useRouter();
  const { setCurrentBill, saveBill } = useBill();

  // Bills and Pagination state
  const [bills, setBills] = useState<BillData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortOption, setSortOption] = useState<BillSortOption>('newest');

  // Filter sheet modal state
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minTotal, setMinTotal] = useState<string>('');
  const [maxTotal, setMaxTotal] = useState<string>('');

  // Debounce search input by 400ms
  const searchTimeoutRef = useRef<any>(null);
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 400);
  };

  // Active filters count calculation
  const activeFiltersCount = [
    Boolean(startDate.trim()),
    Boolean(endDate.trim()),
    Boolean(minTotal.trim()),
    Boolean(maxTotal.trim()),
    sortOption !== 'newest',
  ].filter(Boolean).length;

  /**
   * Main function to fetch bills from backend with search, filters, sorting, and pagination
   */
  const loadBills = useCallback(
    async (pageToLoad = 1, isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else if (pageToLoad === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setErrorMessage(null);

      try {
        const parsedMin = minTotal.trim() ? parseFloat(minTotal.trim()) : undefined;
        const parsedMax = maxTotal.trim() ? parseFloat(maxTotal.trim()) : undefined;

        const res = await fetchBills({
          search: debouncedSearch.trim() || undefined,
          startDate: startDate.trim() || undefined,
          endDate: endDate.trim() || undefined,
          minTotal: isNaN(parsedMin!) ? undefined : parsedMin,
          maxTotal: isNaN(parsedMax!) ? undefined : parsedMax,
          sort: sortOption,
          page: pageToLoad,
          limit: 10,
        });

        if (pageToLoad === 1) {
          setBills(res.bills);
        } else {
          // Append for infinite scroll, avoiding duplicate keys
          setBills((prev) => {
            const existingIds = new Set(prev.map((b) => b.id));
            const newBills = res.bills.filter((b) => !existingIds.has(b.id));
            return [...prev, ...newBills];
          });
        }

        setPagination(res.pagination);

        // Sync items into context cache
        res.bills.forEach((b) => saveBill(b));
      } catch (err: any) {
        console.warn('⚠️ fetchBills error:', err.message);
        setErrorMessage(err.message || 'Failed to load bills from database. Please check connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, startDate, endDate, minTotal, maxTotal, sortOption, saveBill]
  );

  // Trigger search/filter reload whenever parameters change
  useEffect(() => {
    loadBills(1);
  }, [debouncedSearch, startDate, endDate, minTotal, maxTotal, sortOption]);

  // Handle infinite scroll trigger
  const handleLoadMore = () => {
    if (!loading && !loadingMore && pagination.hasMore) {
      loadBills(pagination.page + 1);
    }
  };

  const handleBillPress = (bill: BillData) => {
    setCurrentBill(bill);
    router.push({
      pathname: '/saved-bill',
      params: { id: bill.id },
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStartDate('');
    setEndDate('');
    setMinTotal('');
    setMaxTotal('');
    setSortOption('newest');
    setShowFilterModal(false);
  };

  const totalFilteredAmount = bills.reduce((acc, b) => acc + (b.total || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title="Bill History"
        subtitle={`${pagination.total} saved ${pagination.total === 1 ? 'bill' : 'bills'}`}
        onBack={() => router.replace('/')}
        rightAction={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => loadBills(1, true)}
            activeOpacity={0.7}
            accessibilityLabel="Refresh bills">
            <Ionicons name="refresh-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
        }
      />

      {/* Search Bar & Filter Controls */}
      <View style={styles.topControlSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search store, item or bill #..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Modal Button */}
          <TouchableOpacity
            style={[styles.filterIconButton, activeFiltersCount > 0 && styles.filterIconButtonActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Open filters">
            <Ionicons
              name={activeFiltersCount > 0 ? 'filter' : 'filter-outline'}
              size={19}
              color={activeFiltersCount > 0 ? '#FFFFFF' : '#2563EB'}
            />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadgeCircle}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Sorting Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortChipsContainer}>
          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'newest' && styles.sortChipActive]}
            onPress={() => setSortOption('newest')}
            activeOpacity={0.8}>
            <Ionicons
              name="time-outline"
              size={13}
              color={sortOption === 'newest' ? '#2563EB' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.sortChipText, sortOption === 'newest' && styles.sortChipTextActive]}>
              Newest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'oldest' && styles.sortChipActive]}
            onPress={() => setSortOption('oldest')}
            activeOpacity={0.8}>
            <Ionicons
              name="arrow-up-outline"
              size={13}
              color={sortOption === 'oldest' ? '#2563EB' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.sortChipText, sortOption === 'oldest' && styles.sortChipTextActive]}>
              Oldest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'highest' && styles.sortChipActive]}
            onPress={() => setSortOption('highest')}
            activeOpacity={0.8}>
            <Ionicons
              name="trending-up-outline"
              size={13}
              color={sortOption === 'highest' ? '#2563EB' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.sortChipText, sortOption === 'highest' && styles.sortChipTextActive]}>
              Highest Total
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'lowest' && styles.sortChipActive]}
            onPress={() => setSortOption('lowest')}
            activeOpacity={0.8}>
            <Ionicons
              name="trending-down-outline"
              size={13}
              color={sortOption === 'lowest' ? '#2563EB' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.sortChipText, sortOption === 'lowest' && styles.sortChipTextActive]}>
              Lowest Total
            </Text>
          </TouchableOpacity>

          {activeFiltersCount > 0 && (
            <TouchableOpacity style={styles.clearChipsBtn} onPress={handleResetFilters} activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={13} color="#EF4444" style={{ marginRight: 3 }} />
              <Text style={styles.clearChipsText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Stats summary bar when results are visible */}
        {bills.length > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>FOUND</Text>
              <Text style={styles.summaryValue}>
                {pagination.total} {pagination.total === 1 ? 'bill' : 'bills'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>SUM OF SHOWN</Text>
              <Text style={styles.summaryValueTotal}>₹{totalFilteredAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Content States */}
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.centerStateContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Searching & loading bills...</Text>
            <Text style={styles.loadingSubtext}>Querying persistent database</Text>
          </View>
        ) : errorMessage && bills.length === 0 ? (
          <View style={styles.centerStateContainer}>
            <View style={styles.errorIconBox}>
              <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorDesc}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadBills(1)} activeOpacity={0.8}>
              <Ionicons name="reload-outline" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Retry Query</Text>
            </TouchableOpacity>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.centerStateContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons
                name={activeFiltersCount > 0 || debouncedSearch ? 'search-outline' : 'receipt-outline'}
                size={40}
                color="#94A3B8"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFiltersCount > 0 || debouncedSearch
                ? 'No bills found for your criteria'
                : 'No saved bills yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeFiltersCount > 0 || debouncedSearch
                ? 'Try adjusting your search terms, date range, or amount filters.'
                : 'Scan and review a bill to save your first digital invoice.'}
            </Text>

            {activeFiltersCount > 0 || debouncedSearch ? (
              <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={16} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.resetButtonText}>Reset All Filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.push('/scan')} activeOpacity={0.85}>
                <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Scan First Bill</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadBills(1, true)}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
            renderItem={({ item }) => (
              <BillCard
                bill={item}
                onPress={() => handleBillPress(item)}
              />
            )}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.footerLoaderText}>Loading more bills...</Text>
                </View>
              ) : pagination.hasMore ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} activeOpacity={0.8}>
                  <Text style={styles.loadMoreBtnText}>Load More Bills</Text>
                </TouchableOpacity>
              ) : bills.length > 5 ? (
                <Text style={styles.endOfListText}>All {pagination.total} bills loaded</Text>
              ) : null
            }
          />
        )}
      </View>

      {/* Filter Modal Sheet */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Bills</Text>
                <Text style={styles.modalSubtitle}>Filter by date range and amount</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalContent}>
              {/* Date Range Section */}
              <Text style={styles.filterSectionTitle}>Date Range (YYYY-MM-DD)</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>From Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="2026-01-01"
                    placeholderTextColor="#94A3B8"
                    value={startDate}
                    onChangeText={setStartDate}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>To Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="2026-12-31"
                    placeholderTextColor="#94A3B8"
                    value={endDate}
                    onChangeText={setEndDate}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Amount Range Section */}
              <Text style={styles.filterSectionTitle}>Total Amount Range (₹)</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Min Amount</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={minTotal}
                    onChangeText={setMinTotal}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Max Amount</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={maxTotal}
                    onChangeText={setMaxTotal}
                  />
                </View>
              </View>

              {/* Quick Presets */}
              <Text style={styles.filterSectionTitle}>Quick Date Presets</Text>
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => {
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, '0');
                    setStartDate(`${y}-${m}-01`);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}>
                  <Text style={styles.presetButtonText}>This Month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setStartDate(d.toISOString().split('T')[0]);
                    setEndDate(new Date().toISOString().split('T')[0]);
                  }}>
                  <Text style={styles.presetButtonText}>Last 30 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => {
                    setStartDate('');
                    setEndDate('');
                  }}>
                  <Text style={styles.presetButtonText}>All Time</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={handleResetFilters} activeOpacity={0.8}>
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.85}>
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  topControlSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIconButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sortChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sortChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  clearChipsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearChipsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryValueTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  loadMoreBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  endOfListText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    paddingVertical: 16,
  },
  centerStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 14,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  errorIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resetButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalContent: {
    marginTop: 14,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#0F172A',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
