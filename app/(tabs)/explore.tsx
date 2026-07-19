import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHabits, type HabitType } from '@/context/habits';
import { useChallenges } from '@/context/challenges';
import { useAuth } from '@/context/auth';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  requestPermissions,
  scheduleHabitReminder,
  cancelHabitReminder,
} from '@/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMOJI_OPTIONS = ['🏃', '📚', '🧘', '💧', '😴', '✍️', '🎵', '🥗', '💪', '🧹', '💊', '🚶', '🧠', '🎨', '☕'];

function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ManageScreen() {
  const { habits, addHabit, removeHabit, updateHabit, simulateCompletions } = useHabits();
  const { activeChallenge, createChallenge, getChallengeProgress, forceComplete } = useChallenges();
  const { user, signOut } = useAuth();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);
  const [habitType, setHabitType] = useState<HabitType>('daily');
  const [targetCount, setTargetCount] = useState('3');

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  const [challengeName, setChallengeName] = useState('');
  const [challengeDuration, setChallengeDuration] = useState(7);
  const [challengeHabitIds, setChallengeHabitIds] = useState<string[]>([]);

  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor(
    { light: 'rgba(0,0,0,0.04)', dark: 'rgba(255,255,255,0.06)' },
    'background',
  );
  const inputBorder = useThemeColor(
    { light: 'rgba(0,0,0,0.15)', dark: 'rgba(255,255,255,0.2)' },
    'background',
  );

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const tc = habitType === 'quantity' ? Math.max(1, parseInt(targetCount) || 1) : 1;
    addHabit(trimmed, selectedEmoji, habitType, tc);
    setName('');
    setHabitType('daily');
    setTargetCount('3');
  };

  const handleRemove = (id: string, habitName: string) => {
    if (Platform.OS === 'web') {
      removeHabit(id);
      return;
    }
    Alert.alert('습관 삭제', `"${habitName}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeHabit(id) },
    ]);
  };

  const handleToggleReminder = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (habit.reminderEnabled) {
      updateHabit(habitId, { reminderEnabled: false });
      cancelHabitReminder(habitId);
      setEditingReminderId(null);
    } else {
      if (Platform.OS !== 'web') {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('알림 권한이 필요해요', '기기 설정에서 알림을 켜주세요.');
          return;
        }
      }
      updateHabit(habitId, { reminderEnabled: true });
      setEditingReminderId(habitId);
    }
  };

  const handleAdjustHour = (habitId: string, delta: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const newHour = (habit.reminderHour + delta + 24) % 24;
    updateHabit(habitId, { reminderHour: newHour });
  };

  const handleConfirmReminder = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    scheduleHabitReminder(habitId, habit.name, habit.reminderHour, habit.reminderMinute);
    setEditingReminderId(null);
  };

  const toggleChallengeHabit = (id: string) =>
    setChallengeHabitIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleCreateChallenge = () => {
    const trimmed = challengeName.trim();
    if (!trimmed || challengeHabitIds.length === 0) return;
    createChallenge(trimmed, challengeHabitIds, challengeDuration);
    setChallengeName('');
    setChallengeHabitIds([]);
  };

  const handleSimulateDays = () => {
    if (!activeChallenge) return;
    const entries = habits
      .filter((h) => activeChallenge.habitIds.includes(h.id))
      .map((h) => ({ id: h.id, targetCount: h.targetCount }));
    simulateCompletions(entries, activeChallenge.durationDays);
  };

  const handleForceComplete = () => {
    if (!activeChallenge || activeChallenge.isComplete) return;
    forceComplete(activeChallenge.id);
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem('onboarding_complete');
    if (Platform.OS === 'web') window.location.reload();
  };

  const handleClearData = async () => {
    await AsyncStorage.clear();
    if (Platform.OS === 'web') window.location.reload();
  };

  const handleSignOut = () => {
    const performSignOut = () => {
      signOut().catch(() => Alert.alert('로그아웃하지 못했어요', '잠시 후 다시 시도해 주세요.'));
    };
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃할까요?')) performSignOut();
      return;
    }
    Alert.alert('로그아웃할까요?', '이 기기에서 계정 연결이 해제돼요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: performSignOut },
    ]);
  };

  const challengeProgress =
    activeChallenge && !activeChallenge.isComplete
      ? getChallengeProgress(activeChallenge.id)
      : null;

  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Add Habit ── */}
        <View style={styles.addSection}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            아이콘을 골라주세요
          </ThemedText>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setSelectedEmoji(emoji)}
                style={[
                  styles.emojiButton,
                  { backgroundColor: cardBg },
                  selectedEmoji === emoji && {
                    backgroundColor: tint + '25',
                    borderColor: tint,
                    borderWidth: 2,
                  },
                ]}
              >
                <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            습관 유형
          </ThemedText>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setHabitType('daily')}
              style={[
                styles.typeBtn,
                { backgroundColor: cardBg },
                habitType === 'daily' && { backgroundColor: tint },
              ]}
            >
              <ThemedText
                style={[
                  styles.typeBtnText,
                  habitType === 'daily' && { color: buttonTextColor },
                ]}
              >
                매일 ✓
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setHabitType('quantity')}
              style={[
                styles.typeBtn,
                { backgroundColor: cardBg },
                habitType === 'quantity' && { backgroundColor: tint },
              ]}
            >
              <ThemedText
                style={[
                  styles.typeBtnText,
                  habitType === 'quantity' && { color: buttonTextColor },
                ]}
              >
                횟수
              </ThemedText>
            </Pressable>
          </View>

          {habitType === 'quantity' && (
            <View style={styles.targetRow}>
              <ThemedText style={styles.targetLabel}>하루 목표:</ThemedText>
              <TextInput
                style={[styles.targetInput, { color: textColor, borderColor: inputBorder }]}
                value={targetCount}
                onChangeText={setTargetCount}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          )}

          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            습관 이름
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: inputBorder }]}
              placeholder="예: 아침 달리기"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: tint },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleAdd}
            >
              <ThemedText style={[styles.addButtonText, { color: buttonTextColor }]}>
                추가
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* ── Your Habits ── */}
        <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
          내 습관
        </ThemedText>
        <View style={styles.habitList}>
          {habits.map((habit) => (
            <View
              key={habit.id}
              style={[styles.habitCard, { backgroundColor: cardBg }]}
            >
              <View style={styles.habitRow}>
                <ThemedText style={styles.habitEmoji}>{habit.emoji}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.habitName}>{habit.name}</ThemedText>
                  <View style={styles.habitMeta}>
                    {habit.type === 'quantity' && (
                      <ThemedText style={styles.metaText}>하루 {habit.targetCount}회</ThemedText>
                    )}
                    {habit.reminderEnabled && (
                      <ThemedText style={styles.metaText}>
                        🔔 {formatTime(habit.reminderHour, habit.reminderMinute)}
                      </ThemedText>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={() => handleToggleReminder(habit.id)}
                  style={styles.iconBtn}
                >
                  <ThemedText
                    style={{ fontSize: 18, opacity: habit.reminderEnabled ? 1 : 0.25 }}
                  >
                    🔔
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleRemove(habit.id, habit.name)} hitSlop={8}>
                  <ThemedText style={styles.deleteButton}>✕</ThemedText>
                </Pressable>
              </View>
              {editingReminderId === habit.id && (
                <View style={[styles.reminderRow, { borderTopWidth: 1, borderTopColor: inputBorder }]}>
                  <ThemedText style={styles.reminderLabel}>알림 시각</ThemedText>
                  <Pressable
                    onPress={() => handleAdjustHour(habit.id, -1)}
                    style={[styles.timeBtn, { borderColor: inputBorder }]}
                  >
                    <ThemedText style={styles.timeBtnText}>−</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.timeDisplay}>
                    {formatTime(habit.reminderHour, habit.reminderMinute)}
                  </ThemedText>
                  <Pressable
                    onPress={() => handleAdjustHour(habit.id, 1)}
                    style={[styles.timeBtn, { borderColor: inputBorder }]}
                  >
                    <ThemedText style={styles.timeBtnText}>+</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleConfirmReminder(habit.id)}
                    style={[styles.confirmBtn, { backgroundColor: tint }]}
                  >
                    <ThemedText style={[styles.confirmBtnText, { color: buttonTextColor }]}>설정</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
        {habits.length === 0 && (
          <ThemedText style={styles.emptyText}>아직 습관이 없어요 — 위에서 하나 추가해볼까요?</ThemedText>
        )}

        {/* ── Challenges ── */}
        <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { marginTop: 28 }]}>
          챌린지
        </ThemedText>
        {activeChallenge && !activeChallenge.isComplete ? (
          <View style={[styles.challengeStatus, { backgroundColor: tint + '15' }]}>
            <ThemedText style={styles.challengeActiveTitle}>
              🔥 {activeChallenge.name}
            </ThemedText>
            <ThemedText style={styles.challengeActiveSub}>
              {challengeProgress?.totalDays}일 중 {challengeProgress?.completedDays}일 완료
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.challengeForm, { backgroundColor: cardBg }]}>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: inputBorder, marginBottom: 12 }]}
              placeholder="챌린지 이름"
              placeholderTextColor="#999"
              value={challengeName}
              onChangeText={setChallengeName}
            />
            <ThemedText style={styles.formLabel}>기간</ThemedText>
            <View style={styles.durationRow}>
              {[3, 7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setChallengeDuration(d)}
                  style={[
                    styles.durationBtn,
                    { backgroundColor: challengeDuration === d ? tint : 'transparent', borderColor: inputBorder },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.durationBtnText,
                      challengeDuration === d && { color: buttonTextColor },
                    ]}
                  >
                    {d}일
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.formLabel}>포함할 습관</ThemedText>
            {habits.map((h) => {
              const picked = challengeHabitIds.includes(h.id);
              return (
                <Pressable
                  key={h.id}
                  onPress={() => toggleChallengeHabit(h.id)}
                  style={[
                    styles.challengeHabitRow,
                    { borderColor: picked ? tint : inputBorder },
                    picked && { backgroundColor: tint + '12' },
                  ]}
                >
                  <View
                    style={[
                      styles.chkBox,
                      { borderColor: picked ? tint : inputBorder },
                      picked && { backgroundColor: tint },
                    ]}
                  >
                    {picked && (
                      <ThemedText style={[styles.chkMark, { color: buttonTextColor }]}>✓</ThemedText>
                    )}
                  </View>
                  <ThemedText style={{ fontSize: 18, marginRight: 6 }}>{h.emoji}</ThemedText>
                  <ThemedText style={{ fontSize: 15, flex: 1 }}>{h.name}</ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              style={[
                styles.addButton,
                { backgroundColor: tint, marginTop: 12, alignSelf: 'stretch' },
                (!challengeName.trim() || challengeHabitIds.length === 0) && { opacity: 0.4 },
              ]}
              onPress={handleCreateChallenge}
              disabled={!challengeName.trim() || challengeHabitIds.length === 0}
            >
              <ThemedText style={[styles.addButtonText, { color: buttonTextColor }]}>
                챌린지 시작
              </ThemedText>
            </Pressable>
          </View>
        )}

        <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { marginTop: 28 }]}>
          계정
        </ThemedText>
        <View style={[styles.accountCard, { backgroundColor: cardBg }]}>
          <View style={styles.accountInfo}>
            <ThemedText style={styles.accountLabel}>로그인한 이메일</ThemedText>
            <ThemedText style={styles.accountEmail}>{user?.email}</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignOut}
            style={[styles.signOutButton, { borderColor: inputBorder }]}
          >
            <ThemedText style={styles.signOutText}>로그아웃</ThemedText>
          </Pressable>
        </View>

        {/* ── Dev Tools ── */}
        <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { marginTop: 28 }]}>
          개발자 도구
        </ThemedText>
        <View style={[styles.devTools, { backgroundColor: cardBg }]}>
          <Pressable
            style={[styles.devBtn, { borderColor: inputBorder }]}
            onPress={handleSimulateDays}
          >
            <ThemedText style={styles.devBtnText}>
              전체 챌린지 완료 시뮬레이션
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.devBtn, { borderColor: inputBorder }]}
            onPress={handleForceComplete}
          >
            <ThemedText style={styles.devBtnText}>챌린지 강제 완료</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.devBtn, { borderColor: inputBorder }]}
            onPress={handleResetOnboarding}
          >
            <ThemedText style={styles.devBtnText}>온보딩 초기화</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.devBtn, { borderColor: inputBorder }]}
            onPress={handleClearData}
          >
            <ThemedText style={[styles.devBtnText, { color: '#e74c3c' }]}>
              모든 데이터 삭제
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  addSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 15, opacity: 0.5, marginBottom: 10, marginTop: 16 },
  emojiRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiText: { fontSize: 24 },
  typeRow: { flexDirection: 'row' as const, gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' as const },
  typeBtnText: { fontSize: 15, fontWeight: '600' as const },
  targetRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginTop: 12 },
  targetLabel: { fontSize: 15, opacity: 0.6 },
  targetInput: {
    width: 50,
    height: 40,
    borderWidth: 1.5,
    borderRadius: 10,
    textAlign: 'center' as const,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  inputRow: { flexDirection: 'row' as const, gap: 10 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  addButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  addButtonText: { fontSize: 16, fontWeight: '600' as const },
  habitList: { gap: 10 },
  habitCard: { borderRadius: 14, overflow: 'hidden' as const },
  habitRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
  },
  habitEmoji: { fontSize: 22, marginRight: 10 },
  habitName: { fontSize: 17 },
  habitMeta: { flexDirection: 'row' as const, gap: 10, marginTop: 2 },
  metaText: { fontSize: 12, opacity: 0.5 },
  iconBtn: { padding: 6, marginRight: 4 },
  deleteButton: { fontSize: 18, opacity: 0.35, padding: 4 },
  reminderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  reminderLabel: { fontSize: 13, opacity: 0.5, marginRight: 4 },
  timeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timeBtnText: { fontSize: 16, fontWeight: '600' as const, marginTop: -1 },
  timeDisplay: { fontSize: 14, fontWeight: '600' as const, minWidth: 70, textAlign: 'center' as const },
  emptyText: { fontSize: 16, opacity: 0.5, textAlign: 'center' as const, marginTop: 32 },
  challengeStatus: { padding: 16, borderRadius: 14, marginBottom: 8 },
  challengeActiveTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  challengeActiveSub: { fontSize: 14, opacity: 0.6 },
  challengeForm: { padding: 16, borderRadius: 14 },
  formLabel: { fontSize: 13, opacity: 0.5, marginBottom: 8, marginTop: 4 },
  durationRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 12 },
  durationBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center' as const,
  },
  durationBtnText: { fontSize: 14, fontWeight: '600' as const },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto' as const,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '600' as const },
  challengeHabitRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 6,
    gap: 8,
  },
  chkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chkMark: { fontSize: 13, fontWeight: '700' as const, marginTop: -1 },
  devTools: { padding: 16, borderRadius: 14, gap: 8, marginBottom: 20 },
  devBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  devBtnText: { fontSize: 14 },
  accountCard: { padding: 16, borderRadius: 14, gap: 16 },
  accountInfo: { gap: 3 },
  accountLabel: { fontSize: 13, opacity: 0.5 },
  accountEmail: { fontSize: 16, fontWeight: '600' as const },
  signOutButton: { paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  signOutText: { fontSize: 14, color: '#d64545', fontWeight: '600' as const },
});
