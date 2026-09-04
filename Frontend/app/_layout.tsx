import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BillProvider } from '@/context/BillContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BillProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#F8FAFC' },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="processing" />
          <Stack.Screen name="result" />
          <Stack.Screen name="saved-bill" />
          <Stack.Screen name="history" />
        </Stack>
        <StatusBar style="auto" />
      </BillProvider>
    </SafeAreaProvider>
  );
}
