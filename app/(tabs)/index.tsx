import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Confetti } from '@/components/confetti';
import { useHabits } from '@/context/habits';
import { useChallenges } from '@/context/challenges';
import { useThemeColor } from '@/hooks/use-theme-color';
import { playComplete, playCelebration } from '@/utils/sounds';
import * as Haptics from 'expo-haptics';

export default function TodayScreen() {
  const {
    habits,
    toggleHabit,
    incrementHabit,
    decrementHabit,
    isCompletedToday,
    getStreak,
    getCompletionCount,
  } = useHabits();
  const { activeChallenge, getChallengeProgress, justCompletedId, clearJustCompleted } =
    useChallenges();
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCompleted = useRef(0);

  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;
  const total = habits.length;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = total > 0 && completedCount === total;

  useEffect(() => {
    if (allDone && prevCompleted.current < total && total > 0) {
      setShowConfetti(true);
      playCelebration();
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    prevCompleted.current = completedCount;
  }, [completedCount, allDone, total]);

  useEffect(() => {
    if (justCompletedId) {
      clearJustCompleted();
      router.push(`/challenge-complete?challengeId=${justCompletedId}`);
    }
  }, [justCompletedId]);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const cardBg = useThemeColor(
    { light: 'rgba(0,0,0,0.04)', dark: 'rgba(255,255,255,0.06)' },
    'background',
  );
  const progressBg = useThemeColor(
    { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' },
    'background',
  );

  const handleToggle = (id: string) => {
    const wasComplete = isCompletedToday(id);
    toggleHabit(id);
    if (!wasComplete) {
      playComplete();
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handleIncrement = (id: string) => {
    incrementHabit(id);
    playComplete();
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDecrement = (id: string) => {
    decrementHabit(id);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const challengeProgress =
    activeChallenge && !activeChallenge.isComplete
      ? getChallengeProgress(activeChallenge.id)
      : null;

  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.date}>{dateStr}</ThemedText>

        {challengeProgress && activeChallenge && (
          <View style={[styles.challengeCard, { backgroundColor: cardBg, borderWidth: 1.5, borderColor: tint + '30' }]}>
            <View style={styles.challengeHeader}>
              <ThemedText style={styles.challengeTitle}>🔥 {activeChallenge.name}</ThemedText>
              <ThemedText style={styles.challengeCount}>
                {challengeProgress.completedDays} / {challengeProgress.totalDays} days
              </ThemedText>
            </View>
            <View style={styles.challengeDots}>
              {Array.from({ length: challengeProgress.totalDays }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.challengeDot,
                    {
                      backgroundColor:
                        i < challengeProgress.completedDays ? tint : progressBg,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: tint }]}
            />
          </View>
          <ThemedText style={styles.progressText}>
            {completedCount} of {total} complete
          </ThemedText>
        </View>

        {allDone && (
          <View style={styles.celebration}>
            <ThemedText style={styles.celebrationEmoji}>🎉</ThemedText>
            <ThemedText style={styles.celebrationText}>All done for today!</ThemedText>
          </View>
        )}

        <View style={styles.habitList}>
          {habits.map((habit) => {
            const completed = isCompletedToday(habit.id);
            const streak = getStreak(habit.id);
            const isQuantity = habit.type === 'quantity';
            const count = getCompletionCount(habit.id);

            if (isQuantity) {
              return (
                <View key={habit.id} style={[styles.habitRow, { backgroundColor: cardBg }]}>
                  <ThemedText style={styles.emoji}>{habit.emoji}</ThemedText>
                  <ThemedText style={[styles.habitName, completed && styles.completedName]}>
                    {habit.name}
                  </ThemedText>
                  <ThemedText style={styles.quantityLabel}>
                    {count}/{habit.targetCount}
                  </ThemedText>
                  <View style={styles.quantityControls}>
                    <Pressable
                      onPress={() => handleDecrement(habit.id)}
                      style={[styles.qBtn, { borderColor: progressBg }]}
                    >
                      <ThemedText style={styles.qBtnText}>−</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleIncrement(habit.id)}
                      style={[
                        styles.qBtn,
                        {
                          borderColor: tint,
                          backgroundColor: completed ? tint + '20' : 'transparent',
                        },
                      ]}
                    >
                      <ThemedText style={[styles.qBtnText, { color: tint }]}>+</ThemedText>
                    </Pressable>
                  </View>
                  {streak > 0 && <ThemedText style={styles.streak}>🔥 {streak}</ThemedText>}
                </View>
              );
            }

            return (
              <Pressable
                key={habit.id}
                onPress={() => handleToggle(habit.id)}
                style={({ pressed }) => [
                  styles.habitRow,
                  { backgroundColor: cardBg },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    completed
                      ? { backgroundColor: tint, borderColor: tint }
                      : { borderColor: progressBg },
                  ]}
                >
                  {completed && <ThemedText style={[styles.check, { color: buttonTextColor }]}>✓</ThemedText>}
                </View>
                <ThemedText style={styles.emoji}>{habit.emoji}</ThemedText>
                <ThemedText style={[styles.habitName, completed && styles.completedName]}>
                  {habit.name}
                </ThemedText>
                {streak > 0 && <ThemedText style={styles.streak}>🔥 {streak}</ThemedText>}
              </Pressable>
            );
          })}
        </View>

        {total === 0 && (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📋</ThemedText>
            <ThemedText style={styles.emptyText}>
              No habits yet.{'\n'}Head to the Manage tab to add some!
            </ThemedText>
          </View>
        )}
      </ScrollView>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  date: { fontSize: 16, opacity: 0.5, marginBottom: 20 },
  challengeCard: { padding: 16, borderRadius: 14, marginBottom: 20 },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeTitle: { fontSize: 15, fontWeight: '600' },
  challengeCount: { fontSize: 13, opacity: 0.6 },
  challengeDots: { flexDirection: 'row', gap: 6 },
  challengeDot: { flex: 1, height: 6, borderRadius: 3 },
  progressSection: { marginBottom: 28 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' as const, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, opacity: 0.5 },
  celebration: { alignItems: 'center' as const, marginBottom: 20 },
  celebrationEmoji: { fontSize: 40 },
  celebrationText: { fontSize: 15, opacity: 0.6, marginTop: 4 },
  habitList: { gap: 10 },
  habitRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  check: { fontSize: 15, fontWeight: '700' as const, marginTop: -1 },
  emoji: { fontSize: 22, marginRight: 10 },
  habitName: { fontSize: 17, flex: 1 },
  completedName: { textDecorationLine: 'line-through' as const, opacity: 0.45 },
  streak: { fontSize: 14, opacity: 0.6 },
  quantityLabel: { fontSize: 13, opacity: 0.5, marginRight: 10 },
  quantityControls: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginRight: 8 },
  qBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  qBtnText: { fontSize: 16, fontWeight: '600' as const, marginTop: -1 },
  empty: { alignItems: 'center' as const, marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, opacity: 0.5, textAlign: 'center' as const, lineHeight: 24 },
});
