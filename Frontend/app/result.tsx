import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBill } from '@/context/BillContext';
import { Header } from '@/components/common/Header';
import { EditableField } from '@/components/editor/EditableField';
import { BillItemRow } from '@/components/editor/BillItemRow';
import { BillSummary } from '@/components/editor/BillSummary';
import { OriginalBillPreview } from '@/components/editor/OriginalBillPreview';
import { saveVerifiedBill, updateSavedBill } from '@/services/billApi';

export default function ResultScreen() {
  const router = useRouter();
  const { imageUri, id, mode } = useLocalSearchParams<{ imageUri?: string; id?: string; mode?: string }>();
  const {
    currentBill,
    setCurrentBill,
    saveBill,
    updateItemInCurrentBill,
    addItemToCurrentBill,
    removeItemFromCurrentBill,
    updateTax,
    updateDiscount,
    updateCurrency,
  } = useBill();

  // Fullscreen original bill preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeImageUri = imageUri ? decodeURIComponent(imageUri) : currentBill.imageUri;

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const currency = currentBill.currency || 'INR';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';

  // Currency options for quick selection
  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP'];

  // -------------------------------------------------------------
  // Validation and Save Handler
  // -------------------------------------------------------------
  const handleSaveBill = async () => {
    if (isSaving) return;

    const errors: { [key: string]: string } = {};

    // 1. Customer / Merchant Name validation
    if (!currentBill.customerName.trim()) {
      errors.customerName = 'Please enter a customer or store name.';
    }

    // 2. Date validation
    if (!currentBill.date.trim()) {
      errors.date = 'Please enter a bill date.';
    }

    // 3. Line items validation
    if (currentBill.items.length === 0) {
      Alert.alert('Empty Bill', 'Please add at least one item to the bill.');
      return;
    }

    // Sanitize and validate every line item
    let hasInvalidNumber = false;
    let hasEmptyItemName = false;

    const sanitizedItems = currentBill.items.map((item, idx) => {
      let name = item.name.trim();
      if (!name) {
        hasEmptyItemName = true;
        name = `Item ${idx + 1}`; // Gracefully fallback instead of crashing
      }

      const qty = isNaN(item.quantity) || !isFinite(item.quantity) ? 1 : Math.max(1, item.quantity);
      const price = isNaN(item.price) || !isFinite(item.price) ? 0 : Math.max(0, item.price);
      const total = Math.round(qty * price * 100) / 100;

      if (isNaN(qty) || isNaN(price) || isNaN(total)) {
        hasInvalidNumber = true;
      }

      return {
        ...item,
        name,
        quantity: qty,
        price,
        total,
      };
    });

    if (hasInvalidNumber) {
      Alert.alert('Invalid Numbers', 'Some quantities or prices contain invalid values. Please correct them.');
      return;
    }

    // Validate subtotal and grand total
    const computedSubtotal = sanitizedItems.reduce((acc, it) => acc + it.total, 0);
    const safeTax = isNaN(currentBill.tax ?? 0) || !isFinite(currentBill.tax ?? 0) ? 0 : Math.max(0, currentBill.tax ?? 0);
    const safeDiscount = isNaN(currentBill.discount ?? 0) || !isFinite(currentBill.discount ?? 0) ? 0 : Math.max(0, currentBill.discount ?? 0);
    const computedGrandTotal = Math.max(0, Math.round((computedSubtotal + safeTax - safeDiscount) * 100) / 100);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Alert.alert('Validation Check', 'Please review the highlighted fields before saving.');
      return;
    }

    // Save structured bill
    const finalBillToSave = {
      ...currentBill,
      customerName: currentBill.customerName.trim(),
      items: sanitizedItems,
      subtotal: Math.round(computedSubtotal * 100) / 100,
      tax: safeTax,
      discount: safeDiscount,
      total: computedGrandTotal,
      currency,
      imageUri: activeImageUri || currentBill.imageUri,
    };

    try {
      setIsSaving(true);
      let savedResult: any;

      if (mode === 'edit' && (id || currentBill.id)) {
        const targetId = id || currentBill.id;
        savedResult = await updateSavedBill(targetId, finalBillToSave);
      } else {
        savedResult = await saveVerifiedBill(finalBillToSave);
      }

      saveBill(savedResult);
      setCurrentBill(savedResult);

      // Navigate directly to Bill History screen
      router.push('/history');
    } catch (apiErr: any) {
      console.warn('⚠️ Backend save failed, saving to local context:', apiErr.message);
      saveBill(finalBillToSave);
      Alert.alert(
        'Saved Locally',
        'Bill saved to device storage. Network error: ' + apiErr.message,
        [
          {
            text: 'View in History',
            onPress: () => router.push('/history'),
          },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Review Bill"
        subtitle="Verify & Edit Details"
        onBack={() => router.replace('/')}
        rightAction={
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={handleSaveBill}
            activeOpacity={0.8}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerSaveText}>{mode === 'edit' ? 'Update' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* 1. Review Bill Banner & AI Extracted Indicator */}
          <View style={styles.reviewBanner}>
            <View style={styles.aiIndicatorPill}>
              <Ionicons name="sparkles" size={13} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.aiIndicatorText}>AI EXTRACTED</Text>
            </View>
            <Text style={styles.reviewBannerHeading}>Review Bill</Text>
            <Text style={styles.reviewBannerSub}>
              Please verify the extracted information before saving.
            </Text>
          </View>

          {/* View Original Bill Action Card */}
          {activeImageUri ? (
            <TouchableOpacity
              style={styles.viewOriginalBtn}
              onPress={() => setShowImageModal(true)}
              activeOpacity={0.8}>
              <View style={styles.viewOriginalLeft}>
                <View style={styles.viewOriginalIconWrapper}>
                  <Ionicons name="eye" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.viewOriginalTitle}>View Original Bill</Text>
                  <Text style={styles.viewOriginalSub}>Tap to compare handwriting side-by-side</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color="#2563EB" />
            </TouchableOpacity>
          ) : null}

          {/* 2. Editable Header Fields: Date, Customer Name, Currency */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Bill Information</Text>

            {/* Customer Name */}
            <EditableField
              label="Customer / Merchant Name *"
              value={currentBill.customerName}
              onChangeText={(text) => {
                setCurrentBill((prev) => ({ ...prev, customerName: text }));
                if (validationErrors.customerName) {
                  setValidationErrors((prev) => ({ ...prev, customerName: '' }));
                }
              }}
              placeholder="e.g. Ramesh Kirana Store"
              icon="person-outline"
              confidence={currentBill.fieldConfidence?.customerName}
              error={validationErrors.customerName}
            />

            {/* Date & Invoice Number */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1.2, marginRight: 8 }}>
                <EditableField
                  label="Date *"
                  value={currentBill.date}
                  onChangeText={(text) => {
                    setCurrentBill((prev) => ({ ...prev, date: text }));
                    if (validationErrors.date) {
                      setValidationErrors((prev) => ({ ...prev, date: '' }));
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  icon="calendar-outline"
                  confidence={currentBill.fieldConfidence?.date}
                  error={validationErrors.date}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <EditableField
                  label="Bill Number"
                  value={currentBill.billNumber}
                  onChangeText={(text) =>
                    setCurrentBill((prev) => ({ ...prev, billNumber: text }))
                  }
                  placeholder="INV-001"
                  icon="barcode-outline"
                />
              </View>
            </View>

            {/* Currency Selector */}
            <View style={styles.currencySection}>
              <Text style={styles.currencyLabel}>Currency</Text>
              <View style={styles.currencyPillsRow}>
                {currencyOptions.map((curr) => {
                  const isSelected = currency === curr;
                  return (
                    <TouchableOpacity
                      key={curr}
                      style={[
                        styles.currencyPill,
                        isSelected && styles.currencyPillActive,
                      ]}
                      onPress={() => updateCurrency(curr)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.currencyPillText,
                          isSelected && styles.currencyPillTextActive,
                        ]}>
                        {curr} ({curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 3 & 4. Editable Line Items Section */}
          <View style={styles.sectionCard}>
            <View style={styles.itemsHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Line Items</Text>
                <Text style={styles.sectionSub}>
                  {currentBill.items.length} item(s) • Edit name, quantity, or unit price
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={addItemToCurrentBill}
                activeOpacity={0.75}>
                <Ionicons name="add-circle" size={18} color="#2563EB" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Column Headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { flex: 2.8 }]}>ITEM NAME</Text>
              <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.colHeader, { flex: 1.3, textAlign: 'right' }]}>PRICE</Text>
              <Text style={[styles.colHeader, { flex: 1.4, textAlign: 'right' }]}>TOTAL</Text>
              <View style={{ width: 34 }} />
            </View>

            {/* Editable Item Rows */}
            {currentBill.items.map((item) => (
              <BillItemRow
                key={item.id}
                item={item}
                currencySymbol={currencySymbol}
                onUpdate={(field, val) => updateItemInCurrentBill(item.id, field, val)}
                onDelete={() => removeItemFromCurrentBill(item.id)}
              />
            ))}

            {/* Quick Add Line helper button at bottom of list */}
            <TouchableOpacity
              style={styles.addBottomRowBtn}
              onPress={addItemToCurrentBill}
              activeOpacity={0.7}>
              <Ionicons name="add" size={16} color="#64748B" />
              <Text style={styles.addBottomRowText}>+ Add another item</Text>
            </TouchableOpacity>
          </View>

          {/* 5. Bill Summary with Subtotal, Tax, Discount & Grand Total */}
          <BillSummary
            subtotal={currentBill.subtotal}
            tax={currentBill.tax ?? 0}
            discount={currentBill.discount ?? 0}
            total={currentBill.total}
            currencySymbol={currencySymbol}
            onTaxChange={updateTax}
            onDiscountChange={updateDiscount}
          />

          {/* 6. Prominent Save Bill Button */}
          <TouchableOpacity
            style={[styles.saveBillMainButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveBill}
            activeOpacity={0.85}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.saveBillMainButtonText}>
              {isSaving ? 'Saving to Database...' : mode === 'edit' ? 'Update Verified Bill' : 'Save Verified Bill'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 9. Original Handwritten Bill Modal Preview */}
      <OriginalBillPreview
        visible={showImageModal}
        imageUri={activeImageUri}
        onClose={() => setShowImageModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  headerSaveBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // 1. Review Bill Banner
  reviewBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  aiIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  reviewBannerHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  reviewBannerSub: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // View Original Bill Action
  viewOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  viewOriginalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewOriginalIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  viewOriginalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewOriginalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Sections
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  twoColumnRow: {
    flexDirection: 'row',
  },

  // Currency Selector
  currencySection: {
    marginTop: 6,
  },
  currencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  currencyPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  currencyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  currencyPillTextActive: {
    color: '#FFFFFF',
  },

  // Table Headers
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addBottomRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginTop: 8,
  },
  addBottomRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },

  // Primary Save Button
  saveBillMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBillMainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
