import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  completions: Record<string, Record<string, number>>;
  habits: { id: string; targetCount: number }[];
};

const CELL = 14;
const GAP = 3;
const WEEKS = 13;

export function CalendarHeatmap({ completions, habits }: Props) {
  const dim = useThemeColor({ light: 'rgba(0,0,0,0.3)', dark: 'rgba(255,255,255,0.3)' }, 'text');
  const empty = useThemeColor(
    { light: 'rgba(0,0,0,0.06)', dark: 'rgba(255,255,255,0.08)' },
    'background',
  );

  const { grid, months } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS - 1) * 7 - start.getDay());

    const grid: (string | null)[][] = [];
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < WEEKS; w++) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        if (date > today) {
          week.push(null);
        } else {
          const ds = date.toISOString().split('T')[0];
          week.push(ds);
          if (d === 0 && date.getMonth() !== lastMonth) {
            lastMonth = date.getMonth();
            months.push({
              label: date.toLocaleDateString('en-US', { month: 'short' }),
              col: w,
            });
          }
        }
      }
      grid.push(week);
    }
    return { grid, months };
  }, []);

  const intensity = (dateStr: string): number => {
    if (habits.length === 0) return 0;
    let done = 0;
    for (const h of habits) {
      if ((completions[h.id]?.[dateStr] || 0) >= h.targetCount) done++;
    }
    return done / habits.length;
  };

  const color = (v: number): string => {
    if (v === 0) return empty;
    if (v < 0.33) return '#9be9a8';
    if (v < 0.66) return '#40c463';
    if (v < 1) return '#30a14e';
    return '#216e39';
  };

  const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

  return (
    <View style={styles.root}>
      <View style={styles.dayCol}>
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={{ height: CELL, justifyContent: 'center' as const }}>
            <ThemedText style={[styles.dayLabel, { color: dim }]}>{l}</ThemedText>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.monthRow}>
          {months.map((m, i) => (
            <ThemedText
              key={i}
              style={[styles.monthLabel, { left: m.col * (CELL + GAP), color: dim }]}
            >
              {m.label}
            </ThemedText>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map((day, di) => (
                <View
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 3,
                    backgroundColor: day ? color(intensity(day)) : 'transparent',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row' },
  dayCol: { marginRight: 4, paddingTop: 20, gap: GAP },
  dayLabel: { fontSize: 10 },
  monthRow: { height: 16, position: 'relative', marginBottom: 4 },
  monthLabel: { position: 'absolute', fontSize: 10, top: 0 },
  grid: { flexDirection: 'row', gap: GAP },
});
