import { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHabits, type HabitType } from '@/context/habits';
import { useChallenges } from '@/context/challenges';
import { useOnboarding } from '@/context/onboarding';
import { useThemeColor } from '@/hooks/use-theme-color';

const SUGGESTED = [
  { name: '운동', emoji: '🏃', type: 'daily' as HabitType, target: 1 },
  { name: '독서', emoji: '📚', type: 'daily' as HabitType, target: 1 },
  { name: '명상', emoji: '🧘', type: 'daily' as HabitType, target: 1 },
  { name: '물 마시기', emoji: '💧', type: 'quantity' as HabitType, target: 8 },
  { name: '일기', emoji: '✍️', type: 'daily' as HabitType, target: 1 },
  { name: '산책', emoji: '🚶', type: 'daily' as HabitType, target: 1 },
  { name: '8시간 수면', emoji: '😴', type: 'daily' as HabitType, target: 1 },
  { name: '건강한 식사', emoji: '🥗', type: 'quantity' as HabitType, target: 3 },
];

const HOW_IT_WORKS = [
  { emoji: '📋', title: '습관 만들기', desc: '매일 체크하거나 "물 8잔 마시기"처럼 횟수 목표를 세워보세요' },
  { emoji: '🔥', title: '챌린지 도전', desc: '3일, 7일, 30일 연속에 도전하고 성취를 모아보세요' },
  { emoji: '📊', title: '진행 확인', desc: '연속 기록과 꾸준함, 활동 기록을 한눈에 확인해요' },
  { emoji: '🔔', title: '꾸준히 유지', desc: '습관마다 원하는 시간에 맞춤 알림을 받아보세요' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const { addHabit, removeHabit, habits } = useHabits();
  const { createChallenge } = useChallenges();
  const { markComplete } = useOnboarding();
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
    if (ids.length > 0) createChallenge('3일 킥스타트', ids, 3);
    await markComplete();
    router.replace('/(tabs)');
  };

  const skip = async () => {
    await markComplete();
    router.replace('/(tabs)');
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.bigEmoji}>✨</ThemedText>
          <ThemedText type="title" style={styles.title}>
            오늘부터, 더 나은 나로
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            매일의 습관을 기록하고 연속 기록을 쌓으며, 더 나은 나를 만들어가요.
          </ThemedText>
          <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={() => setStep(1)}>
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              지금 시작해볼까요?
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
            이렇게 사용해요
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
            <ThemedText style={[styles.skip, { color: tint }]}>건너뛰기</ThemedText>
          </Pressable>
          <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={() => setStep(2)}>
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              계속
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
            어떤 습관을 시작해볼까요?
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            최소 3개를 골라 시작해봐요.
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
                    <ThemedText style={styles.cardType}>하루 {h.target}회</ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <Pressable onPress={skip}>
            <ThemedText style={[styles.skip, { color: tint }]}>건너뛰기</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.primary, { backgroundColor: tint }, selected.length < 3 && styles.dim]}
            onPress={() => selected.length >= 3 && setStep(3)}
            disabled={selected.length < 3}
          >
            <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
              계속 ({selected.length}/3+)
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
          3일 챌린지
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          3일 동안 모든 습관을 완료하고 첫 성취를 얻어봐요. 준비됐나요?
        </ThemedText>
        <Pressable style={[styles.primary, { backgroundColor: tint }]} onPress={finish}>
          <ThemedText style={[styles.primaryText, { color: buttonTextColor }]}>
            챌린지 시작
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
