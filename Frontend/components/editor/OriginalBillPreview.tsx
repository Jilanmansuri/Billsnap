import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface OriginalBillPreviewProps {
  visible: boolean;
  imageUri?: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function OriginalBillPreview({
  visible,
  imageUri,
  onClose,
}: OriginalBillPreviewProps) {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleCol}>
            <Text style={styles.title}>Original Handwritten Bill</Text>
            <Text style={styles.subtitle}>Reference image for OCR verification</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Full Image Area */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.fullImage}
            contentFit="contain"
            transition={200}
          />
        </View>

        {/* Bottom Inspection Tip */}
        <View style={styles.bottomTipBar}>
          <Ionicons name="information-circle-outline" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={styles.bottomTipText}>
            Cross-check handwriting directly with the editable fields below
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  fullImage: {
    width: width - 20,
    height: height * 0.76,
  },
  bottomTipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bottomTipText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
});
