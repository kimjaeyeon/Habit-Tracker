import { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CalendarHeatmap } from '@/components/calendar-heatmap';
import { ConsistencyChart } from '@/components/consistency-chart';
import { useHabits } from '@/context/habits';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HistoryScreen() {
  const { habits, completions, getStreak, getBestStreak } = useHabits();
  const [period, setPeriod] = useState<7 | 30>(30);
  const tint = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const cardBg = useThemeColor(
    { light: 'rgba(0,0,0,0.04)', dark: 'rgba(255,255,255,0.06)' },
    'background',
  );

  const bestCurrent = habits.reduce((m, h) => Math.max(m, getStreak(h.id)), 0);
  const bestEver = habits.reduce((m, h) => Math.max(m, getBestStreak(h.id)), 0);

  const overall = (() => {
    if (habits.length === 0) return 0;
    const today = new Date();
    let possible = 0;
    let done = 0;
    for (let i = 0; i < period; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      for (const h of habits) {
        possible++;
        if ((completions[h.id]?.[ds] || 0) >= h.targetCount) done++;
      }
    }
    return possible > 0 ? done / possible : 0;
  })();

  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          History
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.statEmoji}>🔥</ThemedText>
            <ThemedText style={styles.statVal}>{bestCurrent}</ThemedText>
            <ThemedText style={styles.statLabel} numberOfLines={1}>Streak</ThemedText>
          </View>
          <View style={[styles.stat, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.statEmoji}>⭐</ThemedText>
            <ThemedText style={styles.statVal}>{bestEver}</ThemedText>
            <ThemedText style={styles.statLabel} numberOfLines={1}>Best</ThemedText>
          </View>
          <View style={[styles.stat, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.statEmoji}>📊</ThemedText>
            <ThemedText style={styles.statVal}>{Math.round(overall * 100)}%</ThemedText>
            <ThemedText style={styles.statLabel} numberOfLines={1}>{period}d avg</ThemedText>
          </View>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.section}>
          Activity
        </ThemedText>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <CalendarHeatmap
            completions={completions}
            habits={habits.map((h) => ({ id: h.id, targetCount: h.targetCount }))}
          />
        </View>

        <View style={styles.periodHeader}>
          <ThemedText type="defaultSemiBold" style={styles.section}>
            Per-Habit Consistency
          </ThemedText>
          <View style={styles.toggleRow}>
            {([7, 30] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setPeriod(d)}
                style={[styles.toggle, period === d && { backgroundColor: tint }]}
              >
                <ThemedText
                  style={[styles.toggleText, period === d && { color: buttonTextColor }]}
                >
                  {d}d
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {habits.length > 0 ? (
            <ConsistencyChart habits={habits} completions={completions} days={period} />
          ) : (
            <ThemedText style={styles.empty}>Add habits to see consistency data.</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  stat: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statVal: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  statLabel: { fontSize: 11, opacity: 0.5, textAlign: 'center' },
  section: { fontSize: 15, opacity: 0.5, marginBottom: 10 },
  card: { padding: 16, borderRadius: 14, marginBottom: 24 },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleText: { fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 14, opacity: 0.5, textAlign: 'center' },
});
