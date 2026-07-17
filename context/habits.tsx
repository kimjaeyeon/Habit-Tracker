import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HabitType = 'daily' | 'quantity';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  targetCount: number;
  createdAt: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
};

type Completions = Record<string, Record<string, number>>;

type HabitContextType = {
  habits: Habit[];
  completions: Completions;
  toggleHabit: (habitId: string) => void;
  incrementHabit: (habitId: string) => void;
  decrementHabit: (habitId: string) => void;
  addHabit: (name: string, emoji: string, type?: HabitType, targetCount?: number) => Habit;
  removeHabit: (habitId: string) => void;
  updateHabit: (habitId: string, updates: Partial<Habit>) => void;
  getStreak: (habitId: string) => number;
  getBestStreak: (habitId: string) => number;
  isCompletedToday: (habitId: string) => boolean;
  getCompletionCount: (habitId: string, date?: string) => number;
  getConsistency: (habitId: string, days: number) => number;
  simulateCompletions: (entries: { id: string; targetCount: number }[], days: number) => void;
};

const STORAGE_HABITS = 'habits';
const STORAGE_COMPLETIONS = 'completions';

const DEFAULT_HABITS: Habit[] = [
  { id: '1', name: '운동', emoji: '🏃', type: 'daily', targetCount: 1, createdAt: '2026-01-01', reminderEnabled: false, reminderHour: 9, reminderMinute: 0 },
  { id: '2', name: '독서', emoji: '📚', type: 'daily', targetCount: 1, createdAt: '2026-01-01', reminderEnabled: false, reminderHour: 9, reminderMinute: 0 },
  { id: '3', name: '명상', emoji: '🧘', type: 'daily', targetCount: 1, createdAt: '2026-01-01', reminderEnabled: false, reminderHour: 9, reminderMinute: 0 },
  { id: '4', name: '물 마시기', emoji: '💧', type: 'quantity', targetCount: 8, createdAt: '2026-01-01', reminderEnabled: false, reminderHour: 9, reminderMinute: 0 },
  { id: '5', name: '8시간 수면', emoji: '😴', type: 'daily', targetCount: 1, createdAt: '2026-01-01', reminderEnabled: false, reminderHour: 9, reminderMinute: 0 },
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function migrateCompletions(raw: any): Completions {
  if (!raw || typeof raw !== 'object') return {};
  const result: Completions = {};
  for (const [habitId, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      result[habitId] = {};
      for (const date of value as string[]) {
        result[habitId][date] = 1;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[habitId] = value as Record<string, number>;
    }
  }
  return result;
}

function migrateHabits(raw: any[]): Habit[] {
  return raw.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    type: h.type || 'daily',
    targetCount: h.targetCount || 1,
    createdAt: h.createdAt || '2026-01-01',
    reminderEnabled: h.reminderEnabled ?? false,
    reminderHour: h.reminderHour ?? 9,
    reminderMinute: h.reminderMinute ?? 0,
  }));
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [completions, setCompletions] = useState<Completions>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, c] = await Promise.all([
          AsyncStorage.getItem(STORAGE_HABITS),
          AsyncStorage.getItem(STORAGE_COMPLETIONS),
        ]);
        if (h) setHabits(migrateHabits(JSON.parse(h)));
        if (c) setCompletions(migrateCompletions(JSON.parse(c)));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_HABITS, JSON.stringify(habits));
  }, [habits, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_COMPLETIONS, JSON.stringify(completions));
  }, [completions, loaded]);

  const getCompletionCount = useCallback(
    (habitId: string, date?: string): number => {
      return completions[habitId]?.[date || getToday()] || 0;
    },
    [completions],
  );

  const isCompletedToday = useCallback(
    (habitId: string): boolean => {
      const habit = habits.find((h) => h.id === habitId);
      return getCompletionCount(habitId) >= (habit?.targetCount || 1);
    },
    [habits, getCompletionCount],
  );

  const toggleHabit = useCallback((habitId: string) => {
    const today = getToday();
    setCompletions((prev) => {
      const current = prev[habitId]?.[today] || 0;
      const updated = { ...prev, [habitId]: { ...(prev[habitId] || {}) } };
      if (current > 0) {
        delete updated[habitId][today];
      } else {
        updated[habitId][today] = 1;
      }
      return updated;
    });
  }, []);

  const incrementHabit = useCallback((habitId: string) => {
    const today = getToday();
    setCompletions((prev) => ({
      ...prev,
      [habitId]: { ...(prev[habitId] || {}), [today]: (prev[habitId]?.[today] || 0) + 1 },
    }));
  }, []);

  const decrementHabit = useCallback((habitId: string) => {
    const today = getToday();
    setCompletions((prev) => {
      const current = prev[habitId]?.[today] || 0;
      if (current <= 0) return prev;
      const updated = { ...prev, [habitId]: { ...(prev[habitId] || {}) } };
      if (current <= 1) {
        delete updated[habitId][today];
      } else {
        updated[habitId][today] = current - 1;
      }
      return updated;
    });
  }, []);

  const addHabit = useCallback(
    (name: string, emoji: string, type: HabitType = 'daily', targetCount: number = 1): Habit => {
      const newHabit: Habit = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        emoji,
        type,
        targetCount,
        createdAt: getToday(),
        reminderEnabled: false,
        reminderHour: 9,
        reminderMinute: 0,
      };
      setHabits((prev) => [...prev, newHabit]);
      return newHabit;
    },
    [],
  );

  const removeHabit = useCallback((habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setCompletions((prev) => {
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  }, []);

  const updateHabit = useCallback((habitId: string, updates: Partial<Habit>) => {
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, ...updates } : h)));
  }, []);

  const simulateCompletions = useCallback(
    (entries: { id: string; targetCount: number }[], days: number) => {
      setCompletions((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          next[entry.id] = { ...(next[entry.id] || {}) };
          for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            next[entry.id][d.toISOString().split('T')[0]] = entry.targetCount;
          }
        }
        return next;
      });
    },
    [],
  );

  const getStreak = useCallback(
    (habitId: string): number => {
      const habit = habits.find((h) => h.id === habitId);
      const target = habit?.targetCount || 1;
      const logs = completions[habitId] || {};
      const dates = Object.entries(logs)
        .filter(([, count]) => count >= target)
        .map(([date]) => date)
        .sort()
        .reverse();

      if (dates.length === 0) return 0;

      const today = getToday();
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (dates[0] !== today && dates[0] !== yesterday) return 0;

      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
        if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
        else break;
      }
      return streak;
    },
    [habits, completions],
  );

  const getBestStreak = useCallback(
    (habitId: string): number => {
      const habit = habits.find((h) => h.id === habitId);
      const target = habit?.targetCount || 1;
      const dates = Object.entries(completions[habitId] || {})
        .filter(([, count]) => count >= target)
        .map(([date]) => date)
        .sort();

      if (dates.length === 0) return 0;
      let best = 1;
      let current = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
        if (Math.round((curr.getTime() - prev.getTime()) / 86400000) === 1) {
          current++;
          best = Math.max(best, current);
        } else {
          current = 1;
        }
      }
      return best;
    },
    [habits, completions],
  );

  const getConsistency = useCallback(
    (habitId: string, days: number): number => {
      const habit = habits.find((h) => h.id === habitId);
      const target = habit?.targetCount || 1;
      const today = new Date();
      let completed = 0;
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if ((completions[habitId]?.[d.toISOString().split('T')[0]] || 0) >= target) completed++;
      }
      return days > 0 ? completed / days : 0;
    },
    [habits, completions],
  );

  if (!loaded) return null;

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        toggleHabit,
        incrementHabit,
        decrementHabit,
        addHabit,
        removeHabit,
        updateHabit,
        getStreak,
        getBestStreak,
        isCompletedToday,
        getCompletionCount,
        getConsistency,
        simulateCompletions,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}
