import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useBill } from '@/context/BillContext';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchBillById, deleteSavedBill } from '@/services/billApi';
import {
  exportBillAsPdf,
  exportBillAsCsv,
  exportBillAsJson,
  shareExportedFile,
  shareBillAsText,
  getCurrencySymbol,
} from '@/services/exportService';
import { BillData } from '@/types/bill';

export default function SavedBillScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getBillById, currentBill, setCurrentBill, deleteBill } = useBill();

  const [fetchedBill, setFetchedBill] = useState<BillData | null>(null);
  const [showPhoto, setShowPhoto] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'csv' | 'json' | 'text' | null>(null);

  // Retrieve bill from context cache or fallback to fetched/currentBill
  const bill: BillData = (id ? getBillById(id) : null) || fetchedBill || currentBill;
  const currencySymbol = getCurrencySymbol(bill.currency);

  // If opened via direct link and not in context cache, fetch from server
  useEffect(() => {
    if (id && !getBillById(id)) {
      fetchBillById(id)
        .then((b) => setFetchedBill(b))
        .catch((err) => console.warn('Could not load bill details from API:', err.message));
    }
  }, [id]);

  const handleEdit = () => {
    setCurrentBill(bill);
    router.push({
      pathname: '/result',
      params: { id: bill.id, mode: 'edit' },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete invoice ${bill.billNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedBill(bill.id);
            } catch (err: any) {
              console.warn('Backend delete warning (deleting locally):', err.message);
            }
            deleteBill(bill.id);
            Alert.alert('Deleted', 'Bill removed from records.', [
              {
                text: 'OK',
                onPress: () => router.replace('/history'),
              },
            ]);
          },
        },
      ]
    );
  };

  const handleDone = () => {
    router.replace('/history');
  };

  // -------------------------------------------------------------
  // Export Handlers
  // -------------------------------------------------------------
  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      // On web, dismiss modal first so the print preview is completely clear
      if (Platform.OS === 'web') {
        setShowExportModal(false);
      }
      const { filePath, filename } = await exportBillAsPdf(bill);
      if (Platform.OS !== 'web' && filePath) {
        await shareExportedFile(filePath, filename, 'application/pdf');
      }
      setShowExportModal(false);
    } catch (err: any) {
      console.error('❌ PDF export error:', err);
      Alert.alert('Export Error', err.message || 'Could not generate PDF invoice.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingType('csv');
      const { filePath, filename } = await exportBillAsCsv(bill);
      if (Platform.OS !== 'web' && filePath) {
        await shareExportedFile(filePath, filename, 'text/csv');
      }
      setShowExportModal(false);
    } catch (err: any) {
      console.error('❌ CSV export error:', err);
      Alert.alert('Export Error', err.message || 'Could not generate CSV spreadsheet.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportJson = async () => {
    try {
      setExportingType('json');
      const { filePath, filename } = await exportBillAsJson(bill);
      if (Platform.OS !== 'web' && filePath) {
        await shareExportedFile(filePath, filename, 'application/json');
      }
      setShowExportModal(false);
    } catch (err: any) {
      console.error('❌ JSON export error:', err);
      Alert.alert('Export Error', err.message || 'Could not generate JSON file.');
    } finally {
      setExportingType(null);
    }
  };

  const handleShareText = async () => {
    try {
      setExportingType('text');
      await shareBillAsText(bill);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('❌ Share text error:', err);
      Alert.alert('Share Error', err.message || 'Could not share bill text.');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Bill Details"
        subtitle={bill.billNumber}
        onBack={() => router.replace('/history')}
        rightAction={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.shareHeaderBtn}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.7}
              accessibilityLabel="Export or Share">
              <Ionicons name="share-social-outline" size={19} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteHeaderBtn}
              onPress={handleDelete}
              activeOpacity={0.7}
              accessibilityLabel="Delete bill">
              <Ionicons name="trash-outline" size={19} color="#EF4444" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <View style={styles.successTextCol}>
            <Text style={styles.successTitle}>Verified Bill Record</Text>
            <Text style={styles.successSub}>
              Persistent in database • Ready for PDF & CSV export
            </Text>
          </View>
        </View>

        {/* Digital Receipt Card */}
        <View style={styles.receiptCard}>
          {/* Receipt Header */}
          <View style={styles.receiptHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.receiptStoreName} numberOfLines={1}>
                {bill.customerName}
              </Text>
              <Text style={styles.receiptSubtext}>Tax Invoice / Cash Memo</Text>
            </View>
            <StatusBadge status="saved" label="Verified" />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>INVOICE NO.</Text>
              <Text style={styles.metaValue}>{bill.billNumber}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DATE</Text>
              <Text style={styles.metaValue}>{bill.date}</Text>
            </View>
          </View>

          {/* Perforated Divider */}
          <View style={styles.perforatedLine} />

          {/* Items Header */}
          <View style={styles.itemsTable}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.colHeader, { flex: 2.5 }]}>ITEM</Text>
              <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right' }]}>PRICE</Text>
              <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right' }]}>TOTAL</Text>
            </View>

            {/* Items Rows */}
            {bill.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <Text style={[styles.itemName, { flex: 2.5 }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemQty, { flex: 1, textAlign: 'center' }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.itemPrice, { flex: 1.2, textAlign: 'right' }]}>
                  {currencySymbol}{item.price.toFixed(2)}
                </Text>
                <Text style={[styles.itemTotal, { flex: 1.2, textAlign: 'right' }]}>
                  {currencySymbol}{item.total.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Perforated Divider */}
          <View style={styles.perforatedLine} />

          {/* Totals Section */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalVal}>
                {currencySymbol}{bill.subtotal.toFixed(2)}
              </Text>
            </View>
            {(bill.tax ?? 0) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Taxes / VAT</Text>
                <Text style={styles.totalVal}>
                  +{currencySymbol}{(bill.tax ?? 0).toFixed(2)}
                </Text>
              </View>
            )}
            {(bill.discount ?? 0) > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#059669' }]}>Discount</Text>
                <Text style={[styles.totalVal, { color: '#059669' }]}>
                  -{currencySymbol}{(bill.discount ?? 0).toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandVal}>
                {currencySymbol}{bill.total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Original Bill Photo (If available) */}
          {bill.imageUri ? (
            <View style={styles.photoContainer}>
              <TouchableOpacity
                style={styles.photoToggleButton}
                onPress={() => setShowPhoto((prev) => !prev)}
                activeOpacity={0.75}>
                <View style={styles.photoToggleLeft}>
                  <Ionicons name="camera-outline" size={16} color="#2563EB" />
                  <Text style={styles.photoToggleText}>Original Bill Photo</Text>
                </View>
                <View style={styles.photoToggleRight}>
                  <Text style={styles.photoToggleAction}>{showPhoto ? 'Hide' : 'View'}</Text>
                  <Ionicons
                    name={showPhoto ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#64748B"
                  />
                </View>
              </TouchableOpacity>

              {showPhoto && (
                <View style={styles.savedPhotoWrapper}>
                  <Image
                    source={{ uri: bill.imageUri }}
                    style={styles.savedPhotoImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              )}
            </View>
          ) : null}

          {/* Barcode Footer */}
          <View style={styles.barcodeSection}>
            <View style={styles.barcodeLines}>
              {[12, 24, 8, 30, 16, 22, 10, 26, 18, 14, 28, 12, 20, 15, 25].map((w, i) => (
                <View
                  key={i}
                  style={[
                    styles.barcodeBar,
                    { width: (w % 3) + 1.5, marginHorizontal: 2 },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.barcodeText}>{bill.id}</Text>
          </View>
        </View>

        {/* PRIMARY EXPORT & SHARE BUTTON */}
        <TouchableOpacity
          style={styles.exportShareMainBtn}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.85}>
          <View style={styles.exportIconCircle}>
            <Ionicons name="share-social" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exportMainTitle}>Export / Share Bill</Text>
            <Text style={styles.exportMainSub}>Download PDF, CSV, JSON or share directly</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Action Buttons Row (Edit & Delete) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
            activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.editButtonText}>Edit Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Done / Back to History Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.85}>
          <Ionicons name="list-outline" size={19} color="#475569" style={{ marginRight: 8 }} />
          <Text style={styles.doneButtonText}>Back to Bill History</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EXPORT OPTIONS MODAL SHEET */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Export & Share Invoice</Text>
                <Text style={styles.modalSubtitle}>{bill.billNumber} • {bill.customerName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Export Option Cards */}
            <View style={styles.exportOptionsGrid}>
              {/* PDF Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={handleExportPdf}
                disabled={Boolean(exportingType)}
                activeOpacity={0.8}>
                <View style={[styles.exportCardIcon, { backgroundColor: '#FEE2E2' }]}>
                  {exportingType === 'pdf' ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Ionicons name="document-text" size={24} color="#DC2626" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.exportCardTitle}>Export as PDF</Text>
                    <View style={[styles.formatBadge, { backgroundColor: '#FEF2F2' }]}>
                      <Text style={[styles.formatBadgeText, { color: '#DC2626' }]}>INVOICE</Text>
                    </View>
                  </View>
                  <Text style={styles.exportCardDesc}>
                    Clean printable receipt with branding, taxes and totals
                  </Text>
                </View>
              </TouchableOpacity>

              {/* CSV Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={handleExportCsv}
                disabled={Boolean(exportingType)}
                activeOpacity={0.8}>
                <View style={[styles.exportCardIcon, { backgroundColor: '#DCFCE7' }]}>
                  {exportingType === 'csv' ? (
                    <ActivityIndicator size="small" color="#16A34A" />
                  ) : (
                    <Ionicons name="grid" size={24} color="#16A34A" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.exportCardTitle}>Export as CSV</Text>
                    <View style={[styles.formatBadge, { backgroundColor: '#F0FDF4' }]}>
                      <Text style={[styles.formatBadgeText, { color: '#16A34A' }]}>EXCEL</Text>
                    </View>
                  </View>
                  <Text style={styles.exportCardDesc}>
                    Spreadsheet data ready for Excel, Sheets, or accounting
                  </Text>
                </View>
              </TouchableOpacity>

              {/* JSON Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={handleExportJson}
                disabled={Boolean(exportingType)}
                activeOpacity={0.8}>
                <View style={[styles.exportCardIcon, { backgroundColor: '#FEF3C7' }]}>
                  {exportingType === 'json' ? (
                    <ActivityIndicator size="small" color="#D97706" />
                  ) : (
                    <Ionicons name="code-slash" size={24} color="#D97706" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.exportCardTitle}>Export as JSON</Text>
                    <View style={[styles.formatBadge, { backgroundColor: '#FFFBEB' }]}>
                      <Text style={[styles.formatBadgeText, { color: '#D97706' }]}>DATA</Text>
                    </View>
                  </View>
                  <Text style={styles.exportCardDesc}>
                    Complete structured digital record for developers & backups
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Quick Share Text Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={handleShareText}
                disabled={Boolean(exportingType)}
                activeOpacity={0.8}>
                <View style={[styles.exportCardIcon, { backgroundColor: '#EFF6FF' }]}>
                  {exportingType === 'text' ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="chatbubble-ellipses" size={24} color="#2563EB" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.exportCardTitle}>Quick Message Receipt</Text>
                    <View style={[styles.formatBadge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.formatBadgeText, { color: '#2563EB' }]}>TEXT</Text>
                    </View>
                  </View>
                  <Text style={styles.exportCardDesc}>
                    Formatted summary text for WhatsApp, Telegram or SMS
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowExportModal(false)}
              activeOpacity={0.8}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  deleteHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successIconBox: {
    marginRight: 12,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  successSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  receiptStoreName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  perforatedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  itemsTable: {
    marginBottom: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemQty: {
    fontSize: 13,
    color: '#64748B',
  },
  itemPrice: {
    fontSize: 13,
    color: '#64748B',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalsContainer: {
    paddingTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  totalVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  photoContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  photoToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  photoToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoToggleAction: {
    fontSize: 12,
    color: '#64748B',
  },
  savedPhotoWrapper: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#0F172A',
  },
  savedPhotoImage: {
    width: '100%',
    height: '100%',
  },
  barcodeSection: {
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  barcodeLines: {
    flexDirection: 'row',
    height: 30,
    alignItems: 'center',
    marginBottom: 6,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: '#334155',
  },
  barcodeText: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 2,
  },
  exportShareMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exportMainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exportMainSub: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 16,
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
  exportOptionsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  exportCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exportCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  modalCancelBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
