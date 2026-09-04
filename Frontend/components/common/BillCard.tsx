import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillData } from '@/types/bill';

interface BillCardProps {
  bill: BillData;
  onPress: () => void;
}

export function BillCard({ bill, onPress }: BillCardProps) {
  const currencySymbol =
    bill.currency === 'USD' ? '$' : bill.currency === 'EUR' ? '€' : bill.currency === 'GBP' ? '£' : '₹';

  // Format date nicely (e.g. 04 Sep 2026 or raw date string)
  let formattedDate = bill.date || '';
  try {
    const d = new Date(bill.date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {}

  const itemCount = Array.isArray(bill.items) ? bill.items.length : 0;
  const itemsText = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const billIdText = bill.billNumber || bill.id;

  // Only show custom category if it is meaningful (not default 'General')
  const hasCustomCategory =
    bill.category && bill.category.trim().toLowerCase() !== 'general';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Bill for ${bill.customerName || 'Customer'}, total ${currencySymbol}${bill.total.toFixed(2)}`}>
      <View style={styles.leftIconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt-outline" size={20} color="#2563EB" />
        </View>
      </View>

      <View style={styles.contentCol}>
        {/* Top Row: Customer Name & Amount */}
        <View style={styles.topRow}>
          <Text style={styles.customerName} numberOfLines={1}>
            {bill.customerName || 'General Customer'}
          </Text>
          <Text style={styles.amount}>
            {currencySymbol}{bill.total.toFixed(2)}
          </Text>
        </View>

        {/* Bottom Row: Bill # • Date • Items */}
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            {billIdText ? (
              <>
                <Text style={styles.metaText}>{billIdText}</Text>
                <Text style={styles.bullet}>•</Text>
              </>
            ) : null}
            {formattedDate ? (
              <>
                <Text style={styles.metaText}>{formattedDate}</Text>
                <Text style={styles.bullet}>•</Text>
              </>
            ) : null}
            <Text style={styles.metaText}>{itemsText}</Text>

            {hasCustomCategory && (
              <>
                <Text style={styles.bullet}>•</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{bill.category}</Text>
                </View>
              </>
            )}
          </View>

          <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={styles.chevron} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  leftIconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  bullet: {
    marginHorizontal: 5,
    color: '#CBD5E1',
    fontSize: 12,
  },
  categoryBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
  },
  chevron: {
    marginLeft: 6,
  },
});
