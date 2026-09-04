import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'saved' | 'processing' | 'draft' | 'verified';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'saved':
      case 'verified':
        return {
          bg: '#ECFDF5',
          text: '#059669',
          border: '#A7F3D0',
          defaultLabel: 'Saved',
        };
      case 'processing':
        return {
          bg: '#EFF6FF',
          text: '#2563EB',
          border: '#BFDBFE',
          defaultLabel: 'Processing',
        };
      case 'draft':
      default:
        return {
          bg: '#FFFBEB',
          text: '#D97706',
          border: '#FDE68A',
          defaultLabel: 'Draft',
        };
    }
  };

  const config = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}>
      <Text style={[styles.badgeText, { color: config.text }]}>
        {label || config.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
