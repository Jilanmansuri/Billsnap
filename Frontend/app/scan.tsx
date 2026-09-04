import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useBill } from '@/context/BillContext';

const { width } = Dimensions.get('window');
const FRAME_WIDTH = width * 0.84;
const FRAME_HEIGHT = FRAME_WIDTH * 1.35;

export default function ScanScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { startNewScan, setImageUri } = useBill();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isLiveCamera, setIsLiveCamera] = useState(false);

  const isNativeLive = Platform.OS !== 'web' && !!cameraPermission?.granted;
  const hasLiveStream = isNativeLive || (Platform.OS === 'web' && isLiveCamera);

  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  // Auto-request permission on native on mount so camera opens all-time
  useEffect(() => {
    if (Platform.OS !== 'web' && (!cameraPermission || !cameraPermission.granted)) {
      requestCameraPermission();
    }
  }, [cameraPermission?.granted]);

  // Stop live camera tracks on web when leaving or capturing
  const stopLiveCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch {}
      streamRef.current = null;
    }
    setIsLiveCamera(false);
  };

  // Start live camera stream on Web
  const startLiveCamera = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsLiveCamera(true);
      } catch (err) {
        console.log('Live camera stream not supported or permission denied on web:', err);
        setIsLiveCamera(false);
      }
    }
  };

  useEffect(() => {
    if (mode === 'gallery') {
      handlePickGallery();
    } else if (!selectedImageUri && Platform.OS === 'web') {
      startLiveCamera();
    }

    return () => {
      stopLiveCamera();
    };
  }, [mode, selectedImageUri]);

  // Capture photo from all-time live camera
  const handleCapturePhoto = async () => {
    // 1. Native Mobile (Android / iOS): Use CameraView takePictureAsync
    if (Platform.OS !== 'web' && cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setSelectedImageUri(photo.uri);
          return;
        }
      } catch (nativeErr) {
        console.warn('CameraView takePictureAsync error, using native fallback:', nativeErr);
      } finally {
        setLoading(false);
      }
    }

    // 2. Web: If live video stream is active, capture from canvas immediately
    if (Platform.OS === 'web' && isLiveCamera && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          stopLiveCamera();
          setSelectedImageUri(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas capture failed, falling back to direct capture:', err);
      }
    }

    // 3. Web HTTP Fallback (Mobile browser): Open phone camera directly via capture="environment"
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.style.display = 'none';

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          setLoading(true);
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            const result = loadEvt.target?.result as string;
            if (result) {
              stopLiveCamera();
              setSelectedImageUri(result);
            }
            setLoading(false);
          };
          reader.onerror = () => setLoading(false);
          reader.readAsDataURL(file);
        }
        input.remove();
      };

      document.body.appendChild(input);
      input.click();
      return;
    }

    // 4. Native ImagePicker Fallback
    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Camera Error', error?.message || 'Could not open camera. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request gallery permissions and pick image
  const handlePickGallery = async () => {
    // 1. Direct Web File Picker fallback
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          setLoading(true);
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            const result = loadEvt.target?.result as string;
            if (result) {
              stopLiveCamera();
              setSelectedImageUri(result);
            }
            setLoading(false);
          };
          reader.onerror = () => setLoading(false);
          reader.readAsDataURL(file);
        }
        input.remove();
      };

      document.body.appendChild(input);
      input.click();
      return;
    }

    // 2. React Native Native photo library picker
    try {
      setLoading(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert(
          'Photo Library Access Required',
          'BillSnap needs access to your photos to upload a bill. Please enable photo library access in your device settings.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Gallery Error', error?.message || 'Could not pick image from gallery.');
    } finally {
      setLoading(false);
    }
  };

  // Clear preview and return to scanner / camera
  const handleRetake = () => {
    setSelectedImageUri(null);
    startLiveCamera();
  };

  // Proceed with selected/captured image to Processing screen
  const handleUseThisBill = () => {
    if (!selectedImageUri) return;

    // Initialize fresh bill and set image URI in context
    startNewScan('camera', selectedImageUri);
    setImageUri(selectedImageUri);

    // Pass URI via navigation parameters to processing screen
    router.replace({
      pathname: '/processing',
      params: { imageUri: encodeURIComponent(selectedImageUri) },
    });
  };

  // -------------------------------------------------------------
  // PREVIEW STATE (Shown after capturing or picking an image)
  // -------------------------------------------------------------
  if (selectedImageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {/* Top Bar in Preview */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={handleRetake}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topStatusPill}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.topStatusText}>Bill Captured</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Center Preview Content */}
        <View style={styles.previewContainer}>
          <View style={styles.previewFrame}>
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.previewImage}
              contentFit="contain"
              transition={200}
            />

            {/* Corner accents over preview */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.previewTipBox}>
            <Ionicons name="eye-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.previewTipText}>
              Ensure items, quantities, and totals are clear & readable
            </Text>
          </View>
        </View>

        {/* Preview Action Buttons */}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={handleRetake}
            activeOpacity={0.8}>
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.useBillBtn}
            onPress={handleUseThisBill}
            activeOpacity={0.85}>
            <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.useBillBtnText}>Use This Bill</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // CAMERA / SCANNER VIEWFINDER STATE
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Camera Controls Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topStatusPill}>
          <Ionicons name="scan-outline" size={14} color="#60A5FA" style={{ marginRight: 6 }} />
          <Text style={styles.topStatusText}>AI Bill Scanner</Text>
        </View>

        <TouchableOpacity
          style={[styles.circleButton, flashOn && styles.circleButtonActive]}
          onPress={() => setFlashOn((prev) => !prev)}
          activeOpacity={0.7}>
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off-outline'}
            size={20}
            color={flashOn ? '#FBBF24' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Area with Frame */}
      <View style={styles.viewfinderContainer}>
        {/* Instruction Guidance */}
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>
            Fit the entire handwritten bill inside the frame
          </Text>
        </View>

        {/* Rectangular Scanning Frame */}
        <TouchableOpacity
          style={styles.scanningFrame}
          onPress={handleCapturePhoto}
          activeOpacity={0.95}
          accessibilityRole="button"
          accessibilityLabel="Camera viewfinder frame. Tap to capture photo.">
          {/* 1. Real Live Camera Stream (Native Android / iOS via CameraView) */}
          {Platform.OS !== 'web' && cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={flashOn}
              flash={flashOn ? 'on' : 'off'}
            />
          ) : null}

          {/* 1b. Native Camera Permission Request (when not yet granted) */}
          {Platform.OS !== 'web' && !cameraPermission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera" size={50} color="#60A5FA" style={{ marginBottom: 12 }} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSubtext}>
                Allow camera permission to view the live camera and scan bills instantly.
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestCameraPermission}
                activeOpacity={0.8}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.permissionButtonText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 2. Real Live Camera Video Feed (Web / Mobile Browser) */}
          {Platform.OS === 'web' && isLiveCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                borderRadius: 18,
              }}
            />
          ) : null}

          {/* 2b. Web Inactive Camera State */}
          {Platform.OS === 'web' && !isLiveCamera ? (
            <View style={styles.permissionBox}>
              {loading ? (
                <ActivityIndicator size="large" color="#38BDF8" />
              ) : (
                <>
                  <Ionicons name="videocam-off-outline" size={48} color="rgba(255, 255, 255, 0.5)" style={{ marginBottom: 10 }} />
                  <Text style={styles.permissionTitle}>Web Camera Inactive</Text>
                  <Text style={styles.permissionSubtext}>
                    Click below to start web live stream or use shutter button to capture.
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={startLiveCamera}
                    activeOpacity={0.8}>
                    <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.permissionButtonText}>Start Web Camera</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}

          {/* Corner Markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Live Status Pill Overlay */}
          {hasLiveStream ? (
            <View style={styles.liveBadgeOverlay}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.liveBadgeText}>LIVE CAMERA</Text>
            </View>
          ) : null}

          {/* Active Scan Laser Beam (shown when camera is live) */}
          {hasLiveStream ? <View style={styles.scanBeam} /> : null}
        </TouchableOpacity>

        <View style={styles.guidelineRow}>
          <Ionicons name="sunny-outline" size={16} color="#94A3B8" />
          <Text style={styles.guidelineText}>Keep flat • Ensure bright lighting</Text>
        </View>
      </View>

      {/* Bottom Controls Bar */}
      <View style={styles.bottomControls}>
        {/* Gallery Pick Button */}
        <TouchableOpacity
          style={styles.sideControlBtn}
          onPress={handlePickGallery}
          disabled={loading}
          activeOpacity={0.75}>
          <View style={styles.sideIconWrapper}>
            <Ionicons name="images" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Central Camera Shutter Button */}
        <View style={styles.shutterOuterRing}>
          <TouchableOpacity
            style={styles.shutterInnerButton}
            onPress={handleCapturePhoto}
            disabled={loading}
            activeOpacity={0.7}>
            <View style={styles.shutterCenterDot}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={26} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Demo Bill Button (Quick test without physical camera) */}
        <TouchableOpacity
          style={styles.sideControlBtn}
          onPress={() => {
            // Simulated sample bill trigger
            startNewScan('camera');
            router.replace({ pathname: '/processing', params: { source: 'sample' } });
          }}
          disabled={loading}
          activeOpacity={0.75}>
          <View style={styles.sampleIconWrapper}>
            <Ionicons name="sparkles" size={22} color="#FBBF24" />
          </View>
          <Text style={styles.controlLabel}>Sample Bill</Text>
        </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    zIndex: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  topStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topStatusText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  instructionBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  scanningFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  frameCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBox: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  frameHelperText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  frameHelperSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 3,
  },
  liveBadgeOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    zIndex: 20,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.8,
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    height: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  guidelineText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 10,
  },
  sideControlBtn: {
    alignItems: 'center',
    width: 80,
  },
  sideIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sampleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  controlLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },
  shutterOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCenterDot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Preview State Styles
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  previewFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  useBillBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  useBillBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
