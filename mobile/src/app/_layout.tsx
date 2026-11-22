import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toaster from '~/components/Toaster';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { colors } from '~/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const startRemote = useRemoteStore((s) => s.start);

  useEffect(() => startRemote(), [startRemote]);

  // Bookmarks and the overlay live in AsyncStorage; showing the UI before they
  // load would flash empty hearts and an empty Saved tab.
  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.ink900,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="palette/[id]" options={{ title: '' }} />
          <Stack.Screen name="cohesion" options={{ title: 'Cohesion overlay', presentation: 'modal' }} />
        </Stack>
        <Toaster />
      </View>
    </SafeAreaProvider>
  );
}
