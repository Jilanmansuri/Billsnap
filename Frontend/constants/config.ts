import { Platform } from 'react-native';

/**
 * Returns the best API base URL depending on platform, environment, and physical device.
 */
function getApiBaseUrl(): string {
  // 1. If explicitly configured via EXPO_PUBLIC_API_URL, sanitize and use it
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  // 2. Default to deployed Render backend in all environments
  return 'https://billsnap-3275.onrender.com';
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health`,
  EXTRACT_BILL: `${API_BASE_URL}/api/bills/extract`,
  BILLS: `${API_BASE_URL}/api/bills`,
  SAVE_BILL: `${API_BASE_URL}/api/bills`,
};
