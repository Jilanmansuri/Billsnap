import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillItem } from '@/types/bill';

interface BillItemRowProps {
  item: BillItem;
  currencySymbol?: string;
  onUpdate: (field: keyof BillItem, value: string | number) => void;
  onDelete: () => void;
  showDividers?: boolean;
}

export function BillItemRow({
  item,
  currencySymbol = '₹',
  onUpdate,
  onDelete,
  showDividers = true,
}: BillItemRowProps) {
  const qtyConf = item.confidence?.quantity;
  const priceConf = item.confidence?.price;
  const nameConf = item.confidence?.name;

  const hasWarning =
    item.mathMismatch ||
    qtyConf === 'low' ||
    qtyConf === 'medium' ||
    priceConf === 'low' ||
    priceConf === 'medium' ||
    nameConf === 'low';

  const handleNameChange = (val: string) => {
    onUpdate('name', val);
  };

  const handleQtyChange = (val: string) => {
    const parsed = parseInt(val, 10);
    onUpdate('quantity', isNaN(parsed) ? 0 : parsed);
  };

  const handlePriceChange = (val: string) => {
    const parsed = parseFloat(val);
    onUpdate('price', isNaN(parsed) ? 0 : parsed);
  };

  return (
    <View style={[styles.container, hasWarning && styles.warningContainer]}>
      {/* Inputs Row */}
      <View style={styles.inputsRow}>
        {/* Item Name */}
        <View style={styles.nameCol}>
          <TextInput
            style={[
              styles.input,
              nameConf === 'low' && styles.lowBorder,
              nameConf === 'medium' && styles.mediumBorder,
            ]}
            value={item.name}
            onChangeText={handleNameChange}
            placeholder="Item name"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
          />
        </View>

        {/* Quantity */}
        <View style={styles.qtyCol}>
          <TextInput
            style={[
              styles.input,
              styles.centerText,
              (qtyConf === 'low' || item.mathMismatch) && styles.lowBorder,
              qtyConf === 'medium' && styles.mediumBorder,
            ]}
            value={item.quantity === 0 ? '' : item.quantity.toString()}
            onChangeText={handleQtyChange}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Unit Price */}
        <View style={styles.priceCol}>
          <TextInput
            style={[
              styles.input,
              styles.rightText,
              (priceConf === 'low' || item.mathMismatch) && styles.lowBorder,
              priceConf === 'medium' && styles.mediumBorder,
            ]}
            value={item.price === 0 ? '' : item.price.toString()}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Instant Computed Total */}
        <View style={styles.totalCol}>
          <Text style={styles.totalText}>
            {currencySymbol}
            {item.total.toFixed(2)}
          </Text>
        </View>

        {/* Delete Item Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Warning/Flag Bar if calculation or clarity needs verification */}
      {hasWarning && (
        <View style={styles.flagBar}>
          {item.mathMismatch && (
            <View style={styles.dangerPill}>
              <Ionicons name="warning" size={12} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.dangerPillText}>
                Handwriting total differs from Qty × Rate
              </Text>
            </View>
          )}
          {(qtyConf === 'low' || priceConf === 'low') && (
            <View style={styles.dangerPill}>
              <Ionicons name="eye-off-outline" size={12} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.dangerPillText}>Faint / Unclear handwriting</Text>
            </View>
          )}
          {(qtyConf === 'medium' || priceConf === 'medium') && !item.mathMismatch && (
            <View style={styles.warningPill}>
              <Ionicons name="help-circle-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.warningPillText}>Verify quantity/price</Text>
            </View>
          )}
        </View>
      )}

      {showDividers && <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameCol: {
    flex: 2.8,
    marginRight: 6,
  },
  qtyCol: {
    flex: 1,
    marginHorizontal: 3,
  },
  priceCol: {
    flex: 1.3,
    marginHorizontal: 3,
  },
  totalCol: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  deleteButton: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    minHeight: 40,
  },
  centerText: {
    textAlign: 'center',
  },
  rightText: {
    textAlign: 'right',
  },
  lowBorder: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  mediumBorder: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  flagBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dangerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dangerPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B91C1C',
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 8,
  },
});
