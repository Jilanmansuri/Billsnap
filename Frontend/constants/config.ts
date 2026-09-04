import { Platform } from 'react-native';

/**
 * Returns the best API base URL depending on platform, environment, and physical device.
 */
function getApiBaseUrl(): string {
  // 1. If explicitly configured via EXPO_PUBLIC_API_URL (production, staging, or custom IP), prioritize it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web browser default
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // 3. Android Emulator maps host machine to 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // 4. iOS simulator default
  return 'http://localhost:5000';
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health`,
  EXTRACT_BILL: `${API_BASE_URL}/api/bills/extract`,
  BILLS: `${API_BASE_URL}/api/bills`,
  SAVE_BILL: `${API_BASE_URL}/api/bills`,
};
