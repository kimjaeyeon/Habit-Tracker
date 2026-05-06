import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { HabitProvider } from '@/context/habits';
import { ChallengeProvider } from '@/context/challenges';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((v) => {
      setOnboardingDone(v === 'true');
    });
  }, []);

  if (onboardingDone === null) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <HabitProvider>
        <ChallengeProvider>
          <RootStack needsOnboarding={!onboardingDone} />
          <StatusBar style="auto" />
        </ChallengeProvider>
      </HabitProvider>
    </ThemeProvider>
  );
}

function RootStack({ needsOnboarding }: { needsOnboarding: boolean }) {
  useEffect(() => {
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [needsOnboarding]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen
        name="challenge-complete"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}
