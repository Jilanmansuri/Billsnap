import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useBill } from '@/context/BillContext';
import { uploadAndExtractBill } from '@/services/billApi';
import { API_ENDPOINTS } from '@/constants/config';

export default function ProcessingScreen() {
  const router = useRouter();
  const { source, imageUri } = useLocalSearchParams<{ source?: string; imageUri?: string }>();
  const { currentBill, setCurrentBill } = useBill();

  // Selected image URI from query parameters or context
  const activeImageUri = imageUri ? decodeURIComponent(imageUri) : currentBill.imageUri;

  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    { title: 'Connecting to Vision AI...', subtitle: 'Uploading bill photo to BillSnap backend' },
    { title: 'Reading handwritten text...', subtitle: 'Detecting handwriting, items, and unit prices' },
    { title: 'Validating totals & taxes...', subtitle: 'Computing quantities and grand total' },
  ];

  // Perform actual extraction
  const performExtraction = async () => {
    setIsExtracting(true);
    setErrorMessage(null);
    setStepIndex(0);

    // Progressive status updates
    const t1 = setTimeout(() => setStepIndex(1), 1200);
    const t2 = setTimeout(() => setStepIndex(2), 2600);

    try {
      if (activeImageUri) {
        // Real API call to Backend
        const extractedData = await uploadAndExtractBill(activeImageUri);
        clearTimeout(t1);
        clearTimeout(t2);
        setCurrentBill(extractedData);
      } else {
        // Fallback delay if no image provided (sample mode)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      // Transition to Result screen
      router.replace({
        pathname: '/result',
        params: activeImageUri ? { imageUri: encodeURIComponent(activeImageUri) } : undefined,
      });
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsExtracting(false);
      setErrorMessage(
        err.message || 'Failed to connect to backend server. Make sure the backend is running.'
      );
    }
  };

  useEffect(() => {
    // Card gentle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Laser scan line moving up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 240,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    ).start();

    performExtraction();
  }, [pulseAnim, scanLineAnim]);

  // Handler to continue with fallback sample data if offline
  const handleContinueWithSample = () => {
    router.replace({
      pathname: '/result',
      params: activeImageUri ? { imageUri: encodeURIComponent(activeImageUri) } : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}>
          <Ionicons name="close" size={20} color="#94A3B8" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.sourceTag}>
          {source === 'gallery' ? 'Gallery Upload' : 'Captured Bill'}
        </Text>
      </View>

      {/* Center Animated Content */}
      <View style={styles.centerSection}>
        {/* Bill Preview Paper Card */}
        <Animated.View style={[styles.billCard, { transform: [{ scale: pulseAnim }] }]}>
          {activeImageUri ? (
            <View style={styles.realImageContainer}>
              <Image
                source={{ uri: activeImageUri }}
                style={styles.realBillImage}
                contentFit="cover"
                transition={200}
              />
              {/* Moving Laser Scan Line (when extracting) */}
              {isExtracting && (
                <Animated.View
                  style={[
                    styles.laserLine,
                    { transform: [{ translateY: scanLineAnim }] },
                  ]}
                />
              )}
              <View style={styles.imageOverlayBadge}>
                <Ionicons
                  name={isExtracting ? 'scan' : 'alert-circle'}
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.imageOverlayText}>
                  {isExtracting ? 'Scanning with Vision AI' : 'Upload Paused'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.samplePreviewBox}>
              <Ionicons name="receipt-outline" size={54} color="#2563EB" />
              <Text style={styles.sampleTitle}>{currentBill.billNumber}</Text>
              <Text style={styles.sampleSub}>Simulated Bill</Text>
            </View>
          )}
        </Animated.View>

        {/* Dynamic Status / Error Display */}
        {isExtracting ? (
          <View style={styles.statusBox}>
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="large" color="#38BDF8" />
            </View>

            <Text style={styles.mainTitle}>Reading your bill...</Text>
            <Text style={styles.stepTitle}>{steps[stepIndex]?.title}</Text>
            <Text style={styles.stepSubtitle}>{steps[stepIndex]?.subtitle}</Text>

            {/* Progress Step Indicators */}
            <View style={styles.stepDots}>
              {steps.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === stepIndex && styles.activeDot,
                    idx < stepIndex && styles.completedDot,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          /* Error & Retry State */
          <View style={styles.errorBox}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline" size={26} color="#EF4444" />
            </View>
            <Text style={styles.errorHeading}>Backend Connection Issue</Text>
            <Text style={styles.errorDetailText}>{errorMessage}</Text>
            <Text style={styles.targetApiText}>Target: {API_ENDPOINTS.EXTRACT_BILL}</Text>

            <View style={styles.errorActionsRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={performExtraction}
                activeOpacity={0.8}>
                <Ionicons name="reload" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.offlineBtn}
                onPress={handleContinueWithSample}
                activeOpacity={0.8}>
                <Text style={styles.offlineBtnText}>Use Demo Data</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.retakeLink}
              onPress={() => router.replace('/scan')}>
              <Text style={styles.retakeLinkText}>Choose another photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Powered by BillSnap Vision API • Secure & Private
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  sourceTag: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  centerSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  billCard: {
    width: 250,
    height: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  realImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  realBillImage: {
    width: '100%',
    height: '100%',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  samplePreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  sampleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBox: {
    alignItems: 'center',
    marginTop: 24,
  },
  spinnerWrapper: {
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38BDF8',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  activeDot: {
    width: 22,
    backgroundColor: '#38BDF8',
  },
  completedDot: {
    backgroundColor: '#10B981',
  },

  // Error Card Styles
  errorBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  errorHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  errorDetailText: {
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 6,
  },
  targetApiText: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 14,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  offlineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  offlineBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  retakeLink: {
    marginTop: 12,
  },
  retakeLinkText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
