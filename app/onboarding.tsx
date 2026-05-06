import { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHabits, type HabitType } from '@/context/habits';
import { useChallenges } from '@/context/challenges';
import { useThemeColor } from '@/hooks/use-theme-color';

const SUGGESTED = [
  { name: 'Exercise', emoji: '🏃', type: 'daily' as HabitType, target: 1 },
  { name: 'Read', emoji: '📚', type: 'daily' as HabitType, target: 1 },
  { name: 'Meditate', emoji: '🧘', type: 'daily' as HabitType, target: 1 },
  { name: 'Drink Water', emoji: '💧', type: 'quantity' as HabitType, target: 8 },
  { name: 'Journal', emoji: '✍️', type: 'daily' as HabitType, target: 1 },
  { name: 'Walk', emoji: '🚶', type: 'daily' as HabitType, target: 1 },
  { name: 'Sleep 8hrs', emoji: '😴', type: 'daily' as HabitType, target: 1 },
  { name: 'Healthy Meal', emoji: '🥗', type: 'quantity' as HabitType, target: 3 },
];

const HOW_IT_WORKS = [
  { emoji: '📋', title: 'Create Habits', desc: 'Add daily check-ins or counted goals like "drink 8 glasses of water"' },
  { emoji: '🔥', title: 'Take Challenges', desc: 'Push yourself with 3, 7, or 30-day streaks and earn achievements' },
  { emoji: '📊', title: 'Track Progress', desc: 'See your streaks, consistency charts, and activity history' },
  { emoji: '🔔', title: 'Stay on Track', desc: 'Set personalized reminders for each habit at the time that works for you' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const { addHabit, removeHabit, habits } = useHabits();
  const { createChallenge } = useChallenges();
  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const cardBg = useThemeColor(
    { light: 'rgba(0,0,0,0.04)', dark: 'rgba(255,255,255,0.06)' },
    'background',
  );

  const toggle = (i: number) =>
    setSelected((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const finish = async () => {
    for (const h of habits) removeHabit(h.id);
    const ids: string[] = [];
    for (const i of selected) {
      const s = SUGGESTED[i];
      const h = addHabit(s.name, s.emoji, s.type, s.target);
      ids.push(h.id);
    }
    if (ids.length > 0) createChallenge('3-Day Kickstart', ids, 3);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  };

  const skip = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.bigEmoji}>✨</ThemedText>
          <ThemedText type="title" style={styles.title}>
            Build Better Habits
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Track your daily habits, build streaks, and become the best version of yourself.
          </ThemedText>
          <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={() => setStep(1)}>
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              Get Started
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Step 1: How It Works
  if (step === 1) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.howScroll}>
          <ThemedText type="title" style={styles.stepTitle}>
            How It Works
          </ThemedText>
          <View style={styles.howList}>
            {HOW_IT_WORKS.map((item, i) => (
              <View key={i} style={[styles.howCard, { backgroundColor: cardBg }]}>
                <ThemedText style={styles.howEmoji}>{item.emoji}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.howTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.howDesc}>{item.desc}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <Pressable onPress={skip}>
            <ThemedText style={[styles.skip, { color: tint }]}>Skip</ThemedText>
          </Pressable>
          <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={() => setStep(2)}>
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              Continue
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Step 2: Choose Habits
  if (step === 2) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.stepTitle}>
            Choose Your Habits
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Pick at least 3 habits to start your journey.
          </ThemedText>
          <View style={styles.grid}>
            {SUGGESTED.map((h, i) => {
              const on = selected.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggle(i)}
                  style={[
                    styles.card,
                    { backgroundColor: cardBg },
                    on && { backgroundColor: tint + '20', borderColor: tint, borderWidth: 2 },
                  ]}
                >
                  <ThemedText style={styles.cardEmoji}>{h.emoji}</ThemedText>
                  <ThemedText style={styles.cardName}>{h.name}</ThemedText>
                  {h.type === 'quantity' && (
                    <ThemedText style={styles.cardType}>{h.target}x/day</ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <Pressable onPress={skip}>
            <ThemedText style={[styles.skip, { color: tint }]}>Skip</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.primary, { backgroundColor: tint }, selected.length < 3 && styles.dim]}
            onPress={() => selected.length >= 3 && setStep(3)}
            disabled={selected.length < 3}
          >
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              Continue ({selected.length}/3+)
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Step 3: Start Challenge
  return (
    <ThemedView style={styles.container}>
      <View style={styles.centered}>
        <ThemedText style={styles.bigEmoji}>🔥</ThemedText>
        <ThemedText type="title" style={styles.title}>
          3-Day Challenge
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Complete all your habits for 3 days to earn your first achievement. Ready?
        </ThemedText>
        <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={finish}>
          <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
            Start Challenge
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  howScroll: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  bigEmoji: { fontSize: 64, marginBottom: 24 },
  title: { textAlign: 'center', marginBottom: 12 },
  stepTitle: { marginBottom: 12 },
  subtitle: {
    fontSize: 17,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primary: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  primaryText: { fontSize: 17, fontWeight: '600' },
  dim: { opacity: 0.4 },
  howList: { gap: 16 },
  howCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    alignItems: 'center',
  },
  howEmoji: { fontSize: 32 },
  howTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  howDesc: { fontSize: 14, opacity: 0.6, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardType: { fontSize: 12, opacity: 0.5, marginTop: 4 },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  skip: { fontSize: 16 },
});
