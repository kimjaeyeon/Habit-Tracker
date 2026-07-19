import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { HabitProvider } from '@/context/habits';
import { ChallengeProvider } from '@/context/challenges';
import { AuthProvider, useAuth } from '@/context/auth';
import { OnboardingProvider, useOnboarding } from '@/context/onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <OnboardingProvider>
          <HabitProvider>
            <ChallengeProvider>
              <RootStack />
              <StatusBar style="auto" />
            </ChallengeProvider>
          </HabitProvider>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { session, loading } = useAuth();
  const { completed: onboardingDone, loading: onboardingLoading } = useOnboarding();
  const segments = useSegments();

  useEffect(() => {
    if (loading || onboardingLoading) return;
    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in' as Href);
    } else if (session && inAuthGroup) {
      router.replace(onboardingDone ? '/(tabs)' : '/onboarding');
    } else if (session && !onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [loading, onboardingDone, onboardingLoading, segments, session]);

  if (loading || onboardingLoading) return null;

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen
        name="challenge-complete"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}
