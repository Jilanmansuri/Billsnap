import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BillSummaryProps {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currencySymbol?: string;
  onTaxChange: (tax: number) => void;
  onDiscountChange: (discount: number) => void;
}

export function BillSummary({
  subtotal,
  tax,
  discount,
  total,
  currencySymbol = '₹',
  onTaxChange,
  onDiscountChange,
}: BillSummaryProps) {
  const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;
  const safeTax = isNaN(tax) ? 0 : tax;
  const safeDiscount = isNaN(discount) ? 0 : discount;
  const safeGrandTotal = isNaN(total) ? 0 : total;

  const handleTaxInput = (val: string) => {
    const num = parseFloat(val);
    onTaxChange(isNaN(num) || num < 0 ? 0 : num);
  };

  const handleDiscountInput = (val: string) => {
    const num = parseFloat(val);
    onDiscountChange(isNaN(num) || num < 0 ? 0 : num);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Bill Summary & Totals</Text>

      {/* Subtotal */}
      <View style={styles.row}>
        <View style={styles.labelCol}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.subtext}>Sum of all item totals</Text>
        </View>
        <Text style={styles.valueText}>
          {currencySymbol}
          {safeSubtotal.toFixed(2)}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Editable Tax Input */}
      <View style={styles.inputRow}>
        <View style={styles.labelCol}>
          <Text style={styles.label}>Tax / GST / VAT</Text>
          <Text style={styles.subtext}>Applicable tax amount</Text>
        </View>
        <View style={styles.numInputWrapper}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.numInput}
            value={safeTax === 0 ? '' : safeTax.toString()}
            onChangeText={handleTaxInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Editable Discount Input */}
      <View style={styles.inputRow}>
        <View style={styles.labelCol}>
          <Text style={styles.label}>Discount</Text>
          <Text style={styles.subtext}>Deducted from subtotal</Text>
        </View>
        <View style={styles.numInputWrapper}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.numInput}
            value={safeDiscount === 0 ? '' : safeDiscount.toString()}
            onChangeText={handleDiscountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.boldDivider} />

      {/* Grand Total */}
      <View style={styles.grandTotalRow}>
        <View>
          <Text style={styles.grandTotalTitle}>Grand Total</Text>
          <Text style={styles.grandFormula}>Subtotal + Tax - Discount</Text>
        </View>
        <View style={styles.grandTotalValueBox}>
          <Text style={styles.grandTotalCurrency}>{currencySymbol}</Text>
          <Text style={styles.grandTotalValue}>{safeGrandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  labelCol: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  subtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  numInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    width: 120,
    height: 40,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  numInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  boldDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  grandTotalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandFormula: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  grandTotalValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  grandTotalCurrency: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
    marginRight: 2,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
  },
});
