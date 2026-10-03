import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts as useManrope,
} from '@expo-google-fonts/manrope';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as usePlusJakarta,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Redirect, router, Stack, ThemeProvider as NavigationThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureChannels } from '../core/notifications';
import { SettingsProvider, useSettings } from '../state/SettingsContext';
import { AlarmsProvider, useAlarms } from '../state/AlarmsContext';
import { RemindersProvider } from '../state/RemindersContext';
import { useTheme } from '../theme/ThemeProvider';

export default function RootLayout() {
  const [manropeLoaded] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const [jakartaLoaded] = usePlusJakarta({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const fontsReady = manropeLoaded && jakartaLoaded;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AlarmsProvider>
            <RemindersProvider>
              <AppShell ready={fontsReady} />
            </RemindersProvider>
          </AlarmsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell({ ready }: { ready: boolean }) {
  const { colorScheme, settings, ready: settingsReady } = useSettings();
  const pathname = usePathname();
  const { ringing, startRinging } = useAlarms();
  const theme = useTheme();

  // Android needs at least one channel to exist before it shows the
  // notification permission dialog.
  useEffect(() => {
    ensureChannels().catch(() => {});
  }, []);

  // Foreground delivery: a notification that arrives while the app is open.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string; alarmId?: string; reminderId?: string };
      if (data.type === 'alarm' && data.alarmId) startRinging(data.alarmId, true);
      if (data.type === 'reminder' && data.reminderId) router.push('/reminder/edit');
    });
    return () => subscription.remove();
  }, [startRinging]);

  // Background / cold start: the app was opened by tapping a notification.
  useEffect(() => {
    const response = Notifications.getLastNotificationResponse();
    const data = response?.notification.request.content.data as { type?: string; alarmId?: string } | undefined;
    if (data?.type === 'alarm' && data.alarmId) startRinging(data.alarmId, true);

    // Renamed from `addNotificationResponseListener` in SDK 57.
    const subscription = Notifications.addNotificationResponseReceivedListener((next) => {
      const payload = next.notification.request.content.data as { type?: string; alarmId?: string };
      if (payload.type === 'alarm' && payload.alarmId) startRinging(payload.alarmId, true);
      if (payload.type === 'reminder') router.push('/reminder/edit');
    });
    return () => subscription.remove();
  }, [startRinging]);

  // A ringing alarm owns the screen: it is presented over the whole navigator.
  useEffect(() => {
    if (ringing) router.push('/alarm/ringing');
  }, [ringing]);

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  // First launch lands on onboarding; every later launch skips it.
  if (ready && settingsReady && !settings.onboarded && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (!ready) {
    return <View style={[styles.splash, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <NavigationThemeProvider
      value={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          primary: theme.colors.accent,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
        },
      }}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="alarm/ringing"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            gestureEnabled: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
        <Stack.Screen name="alarm/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reminder/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sounds" options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="stats" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
  },
});
