import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BillData } from '@/types/bill';
import { formatCurrency, getCurrencySymbol } from '@/services/exportService';

interface PrintableInvoiceProps {
  bill: BillData;
}

/**
 * Dedicated Printable Invoice Component independent of the screen UI.
 * Pure document flow, no position: fixed, no animations, standard table layout.
 */
export function PrintableInvoice({ bill }: PrintableInvoiceProps) {
  const currency = bill.currency || 'INR';
  const customerName = bill.customerName?.trim() || 'General Customer';
  const billId = bill.billNumber || bill.id || 'INV-001';
  const items = Array.isArray(bill.items) ? bill.items : [];

  const subtotal = bill.subtotal ?? 0;
  const discount = bill.discount ?? 0;
  const tax = bill.tax ?? 0;
  const grandTotal = bill.total ?? subtotal + tax - discount;

  return (
    <View style={styles.container} nativeID="billsnap-printable-invoice">
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>BillSnap</Text>
          <Text style={styles.brandTagline}>Digitized Retail Bill &amp; Tax Invoice</Text>
          <Text style={styles.storeAddress}>12, Market Road, Rajkot - 360001</Text>
          <Text style={styles.storeContact}>Ph: +91 98765 43210 • support@billsnap.app</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.invoiceBadge}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>#{billId}</Text>
          <Text style={styles.invoiceDate}>Date: {bill.date || 'Today'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 2. Customer Section */}
      <View style={styles.customerSection}>
        <Text style={styles.sectionLabel}>BILLED TO</Text>
        <Text style={styles.customerName}>{customerName}</Text>
        <Text style={styles.customerDetails}>
          {bill.category ? `Category: ${bill.category}` : 'Verified Customer Record'}
        </Text>
      </View>

      {/* 3. Line Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colNum]}>#</Text>
          <Text style={[styles.colHeader, styles.colName]}>ITEM NAME</Text>
          <Text style={[styles.colHeader, styles.colQty]}>QTY</Text>
          <Text style={[styles.colHeader, styles.colPrice]}>UNIT PRICE</Text>
          <Text style={[styles.colHeader, styles.colAmount]}>AMOUNT</Text>
        </View>

        {/* Table Rows */}
        {items.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No items listed.</Text>
          </View>
        ) : (
          items.map((item, idx) => {
            const qty = item.quantity || 1;
            const price = item.price ?? 0;
            const total = item.total ?? qty * price;
            return (
              <View key={item.id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.cellText, styles.colNum]}>{idx + 1}</Text>
                <Text style={[styles.cellTextBold, styles.colName]}>{item.name || `Item ${idx + 1}`}</Text>
                <Text style={[styles.cellText, styles.colQty]}>{qty}</Text>
                <Text style={[styles.cellText, styles.colPrice]}>{formatCurrency(price, currency)}</Text>
                <Text style={[styles.cellTextBold, styles.colAmount]}>{formatCurrency(total, currency)}</Text>
              </View>
            );
          })
        )}
      </View>

      {/* 4. Summary & Totals */}
      <View style={styles.summaryContainer}>
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Notes / Remarks</Text>
          <Text style={styles.notesContent}>
            {bill.notes || 'Digitally verified via BillSnap. Mathematically audited against handwritten original.'}
          </Text>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>Discount (-)</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>-{formatCurrency(discount, currency)}</Text>
            </View>
          )}

          {tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax / GST (+)</Text>
              <Text style={styles.summaryValue}>+{formatCurrency(tax, currency)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal, currency)}</Text>
          </View>
        </View>
      </View>

      {/* 5. Footer */}
      <View style={styles.footer}>
        <Text style={styles.thankYou}>Thank you for your business!</Text>
        <Text style={styles.footerNote}>Currency: {currency} • Generated digitally by BillSnap</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
  },
  brandTagline: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  storeAddress: {
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
  },
  storeContact: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceBadge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 2,
    backgroundColor: '#2563EB',
    marginVertical: 14,
  },
  customerSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  colNum: {
    width: 35,
    textAlign: 'center',
  },
  colName: {
    flex: 1,
    paddingHorizontal: 8,
  },
  colQty: {
    width: 55,
    textAlign: 'center',
  },
  colPrice: {
    width: 95,
    textAlign: 'right',
  },
  colAmount: {
    width: 105,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  cellText: {
    fontSize: 12,
    color: '#334155',
  },
  cellTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  notesBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  totalsBox: {
    width: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
