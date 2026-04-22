import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { Asset } from 'expo-asset';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { isDarkTheme } from '../src/constants/themes';

const CATEGORY_IMAGES = [
  require('../assets/categories/yoga.jpg'),
  require('../assets/categories/running.jpg'),
  require('../assets/categories/cycling.jpg'),
  require('../assets/categories/strength.jpg'),
];

const EVENT_COVER_IMAGES = [
  require('../assets/event-covers/yoga.jpg'),
  require('../assets/event-covers/running.jpg'),
  require('../assets/event-covers/cycling.jpg'),
  require('../assets/event-covers/strength.jpg'),
  require('../assets/event-covers/swimming.jpg'),
];

function RootLayoutContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, variant } = useTheme();

  return (
    <View style={styles.root}>
      <StatusBar
        style={isDarkTheme(variant) ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/email" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/gender" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="auth/verify-email" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(organizer)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(admin)" options={{ animation: 'fade' }} />
        <Stack.Screen name="blocked" options={{ animation: 'fade' }} />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="all-events" />
        <Stack.Screen
          name="event/[id]"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="booking"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="waiting"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="post-event"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="check-in"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="test-login" />
        <Stack.Screen name="complaint" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/subscription" />
        <Stack.Screen name="organizer-event/create" />
        <Stack.Screen name="organizer-event/list" />
        <Stack.Screen name="organizer-event/stats" />
        <Stack.Screen name="organizer-event/certificates" />
        <Stack.Screen name="organizer-event/[id]" />
        <Stack.Screen name="organizer-event/[id]/participants" />
        <Stack.Screen name="organizer-event/[id]/check-in" />
        <Stack.Screen name="trainer-crm/index" />
        <Stack.Screen name="trainer-crm/clients" />
        <Stack.Screen name="trainer-crm/client-create" />
        <Stack.Screen name="trainer-crm/client/[id]" />
        <Stack.Screen name="trainer-crm/sessions" />
        <Stack.Screen name="trainer-crm/session-create" />
        <Stack.Screen name="trainer-crm/session/[id]" />
        <Stack.Screen name="admin-search" />
        <Stack.Screen name="admin-event/[id]" />
        <Stack.Screen name="admin-complaint/[id]" />
        <Stack.Screen name="admin-ban-appeal/[id]" />
        <Stack.Screen name="admin-user/[id]" />
        <Stack.Screen name="private-event" />
        <Stack.Screen name="invite/[token]" />
      </Stack>

      {!fontsLoaded ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <LoadingSpinner fullScreen text="Загрузка..." />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_900Black,
  });

  useEffect(() => {
    // Preload images in background (non-blocking)
    Asset.loadAsync([...CATEGORY_IMAGES, ...EVENT_COVER_IMAGES]).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutContent fontsLoaded={fontsLoaded} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
});
