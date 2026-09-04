import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardTypeOptions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldConfidence } from '@/types/bill';

interface EditableFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  icon?: keyof typeof Ionicons.glyphMap;
  confidence?: FieldConfidence;
  helperText?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
}

export function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  icon,
  confidence,
  helperText,
  error,
  style,
  editable = true,
}: EditableFieldProps) {
  const isLowConfidence = confidence === 'low';
  const isMediumConfidence = confidence === 'medium';

  const getBorderColor = () => {
    if (error) return '#EF4444';
    if (isLowConfidence) return '#EF4444';
    if (isMediumConfidence) return '#F59E0B';
    return '#CBD5E1';
  };

  const getBackgroundColor = () => {
    if (error) return '#FEF2F2';
    if (isLowConfidence) return '#FEF2F2';
    if (isMediumConfidence) return '#FFFBEB';
    return '#F8FAFC';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isLowConfidence && (
          <View style={styles.lowBadge}>
            <Text style={styles.lowBadgeText}>Low Clarity</Text>
          </View>
        )}
        {isMediumConfidence && (
          <View style={styles.mediumBadge}>
            <Text style={styles.mediumBadgeText}>Please Verify</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
        ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? '#EF4444' : isMediumConfidence ? '#D97706' : '#64748B'}
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize="sentences"
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  lowBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lowBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  mediumBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  mediumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
