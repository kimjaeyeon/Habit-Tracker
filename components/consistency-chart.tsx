import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  habits: { id: string; name: string; emoji: string; targetCount: number }[];
  completions: Record<string, Record<string, number>>;
  days: number;
};

export function ConsistencyChart({ habits, completions, days }: Props) {
  const barBg = useThemeColor(
    { light: 'rgba(0,0,0,0.06)', dark: 'rgba(255,255,255,0.08)' },
    'background',
  );
  const tint = useThemeColor({}, 'tint');

  const pct = (habitId: string, target: number): number => {
    const today = new Date();
    let done = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if ((completions[habitId]?.[d.toISOString().split('T')[0]] || 0) >= target) done++;
    }
    return days > 0 ? done / days : 0;
  };

  return (
    <View style={styles.container}>
      {habits.map((h) => {
        const p = pct(h.id, h.targetCount);
        return (
          <View key={h.id} style={styles.row}>
            <ThemedText style={styles.label} numberOfLines={1}>
              {h.emoji} {h.name}
            </ThemedText>
            <View style={styles.barRow}>
              <View style={[styles.barBg, { backgroundColor: barBg }]}>
                <View
                  style={[styles.barFill, { width: `${p * 100}%`, backgroundColor: tint }]}
                />
              </View>
              <ThemedText style={styles.pct}>{Math.round(p * 100)}%</ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  row: { gap: 6 },
  label: { fontSize: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' as const },
  barFill: { height: '100%', borderRadius: 4 },
  pct: { fontSize: 13, opacity: 0.5, width: 36, textAlign: 'right' as const },
});
