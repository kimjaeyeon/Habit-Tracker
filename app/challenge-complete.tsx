import { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Confetti } from '@/components/confetti';
import { useChallenges } from '@/context/challenges';
import { useThemeColor } from '@/hooks/use-theme-color';
import { playCelebration } from '@/utils/sounds';
import * as Haptics from 'expo-haptics';

export default function ChallengeCompleteScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { challenges, claimReward, getChallengeProgress } = useChallenges();
  const [confetti, setConfetti] = useState(true);
  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  const challenge = challenges.find((c) => c.id === challengeId);
  const progress = challenge ? getChallengeProgress(challenge.id) : null;

  useEffect(() => {
    playCelebration();
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const handleContinue = () => {
    if (challengeId) claimReward(challengeId);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.trophy}>🏆</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Challenge Complete!
        </ThemedText>
        {challenge && (
          <>
            <ThemedText style={styles.name}>{challenge.name}</ThemedText>
            <ThemedText style={styles.stats}>
              {progress?.completedDays} days completed{'\n'}
              {challenge.habitIds.length} habits tracked
            </ThemedText>
          </>
        )}
        <Pressable style={[styles.button, { backgroundColor: tint }]} onPress={handleContinue}>
          <ThemedText style={[styles.buttonLabel, { color: buttonTextColor }]}>Continue</ThemedText>
        </Pressable>
      </View>
      <Confetti active={confetti} onComplete={() => setConfetti(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  trophy: { fontSize: 80, marginBottom: 24 },
  title: { textAlign: 'center', marginBottom: 8 },
  name: { fontSize: 18, opacity: 0.6, marginBottom: 16 },
  stats: { fontSize: 16, opacity: 0.5, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  buttonLabel: { fontSize: 17, fontWeight: '600' },
});
