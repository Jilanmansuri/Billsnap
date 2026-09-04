import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBill } from '@/context/BillContext';
import { BillCard } from '@/components/common/BillCard';
import { fetchBills } from '@/services/billApi';

export default function HomeScreen() {
  const router = useRouter();
  const { savedBills, startNewScan, setCurrentBill, saveBill } = useBill();

  useEffect(() => {
    fetchBills({ limit: 10 })
      .then((res) => {
        res.bills.forEach((b) => saveBill(b));
      })
      .catch((err) => {
        console.warn('⚠️ Could not sync saved bills on home mount:', err.message);
      });
  }, []);

  const handleScanPress = () => {
    router.push('/scan');
  };

  const handleGalleryPress = () => {
    router.push({ pathname: '/scan', params: { mode: 'gallery' } });
  };

  const handleBillPress = (billId: string) => {
    const bill = savedBills.find((b) => b.id === billId);
    if (bill) {
      setCurrentBill(bill);
      router.push({ pathname: '/saved-bill', params: { id: bill.id } });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandIconContainer}>
            <Ionicons name="document-text" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.brandTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>BillSnap</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Smart OCR</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>
              Turn handwritten bills into digital data
            </Text>
          </View>
        </View>

        {/* Feature Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroContent}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTag}>SMART DIGITIZER</Text>
              <Text style={styles.heroHeading}>Snap, Extract & Edit in Seconds</Text>
              <Text style={styles.heroDesc}>
                Take a photo of any handwritten receipt or invoice. We'll automatically detect line items, prices, and totals.
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="scan-circle" size={44} color="#2563EB" />
            </View>
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {/* Primary Action: Large Scan Bill */}
          <TouchableOpacity
            style={styles.primaryScanButton}
            onPress={handleScanPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Scan Bill with Camera">
            <View style={styles.scanIconCircle}>
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanButtonTitle}>Scan Bill</Text>
              <Text style={styles.scanButtonSubtitle}>Open camera to capture handwritten bill</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
          </TouchableOpacity>

          {/* Secondary Action: Upload from Gallery */}
          <TouchableOpacity
            style={styles.secondaryGalleryButton}
            onPress={handleGalleryPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Upload bill from photo gallery">
            <View style={styles.galleryIconCircle}>
              <Ionicons name="images-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.galleryTextContainer}>
              <Text style={styles.galleryButtonTitle}>Upload from Gallery</Text>
              <Text style={styles.galleryButtonSubtitle}>Choose an existing photo from device</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Quick Tips Box */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={16} color="#D97706" style={styles.tipIcon} />
          <Text style={styles.tipText}>
            Tip: Place the bill flat under good lighting with all corners visible for optimal extraction accuracy.
          </Text>
        </View>

        {/* Recent Scans Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.recentTitle}>Recent Scans</Text>
              <Text style={styles.recentSubtitle}>
                {savedBills.length} {savedBills.length === 1 ? 'bill' : 'bills'} on record
              </Text>
            </View>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => router.push('/history')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View all bill history">
              <Text style={styles.historyBtnText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color="#2563EB" style={styles.historyBtnIcon} />
            </TouchableOpacity>
          </View>

          {savedBills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No bills scanned yet</Text>
              <Text style={styles.emptyDesc}>
                Tap "Scan Bill" above to digitize your first receipt.
              </Text>
            </View>
          ) : (
            savedBills.slice(0, 5).map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onPress={() => handleBillPress(bill.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 16) + 6 : 14,
    paddingBottom: 36,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
    lineHeight: 21,
  },
  heroDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionsContainer: {
    marginBottom: 16,
    gap: 10,
  },
  primaryScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  scanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scanButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  arrowIcon: {
    marginLeft: 6,
  },
  secondaryGalleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  galleryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  galleryTextContainer: {
    flex: 1,
  },
  galleryButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  galleryButtonSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  recentSection: {
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  historyBtnIcon: {
    marginLeft: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 3,
  },
});
