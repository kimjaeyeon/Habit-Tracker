import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHabits } from './habits';

export type Challenge = {
  id: string;
  name: string;
  habitIds: string[];
  startDate: string;
  durationDays: number;
  isComplete: boolean;
  rewardClaimed: boolean;
};

type ChallengeContextType = {
  challenges: Challenge[];
  activeChallenge: Challenge | null;
  justCompletedId: string | null;
  createChallenge: (name: string, habitIds: string[], durationDays: number) => void;
  claimReward: (challengeId: string) => void;
  clearJustCompleted: () => void;
  forceComplete: (challengeId: string) => void;
  getChallengeProgress: (challengeId: string) => { completedDays: number; totalDays: number };
};

const STORAGE_KEY = 'challenges';
const ChallengeContext = createContext<ChallengeContextType | null>(null);

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const { completions, habits } = useHabits();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const challengesRef = useRef(challenges);
  challengesRef.current = challenges;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setChallenges(JSON.parse(raw));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
  }, [challenges, loaded]);

  const getChallengeProgress = useCallback(
    (challengeId: string) => {
      const challenge = challengesRef.current.find((c) => c.id === challengeId);
      if (!challenge) return { completedDays: 0, totalDays: 0 };

      const start = new Date(challenge.startDate + 'T00:00:00');
      const today = new Date(getToday() + 'T00:00:00');
      let completedDays = 0;

      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const allDone = challenge.habitIds.every((hid) => {
          const habit = habits.find((h) => h.id === hid);
          return (completions[hid]?.[dateStr] || 0) >= (habit?.targetCount || 1);
        });
        if (allDone) completedDays++;
      }

      return { completedDays, totalDays: challenge.durationDays };
    },
    [completions, habits],
  );

  useEffect(() => {
    if (!loaded) return;
    const current = challengesRef.current;
    let changed = false;
    let newlyCompleted: string | null = null;

    const updated = current.map((challenge) => {
      if (challenge.isComplete) return challenge;

      const start = new Date(challenge.startDate + 'T00:00:00');
      const today = new Date(getToday() + 'T00:00:00');
      let completedDays = 0;

      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const allDone = challenge.habitIds.every((hid) => {
          const habit = habits.find((h) => h.id === hid);
          return (completions[hid]?.[dateStr] || 0) >= (habit?.targetCount || 1);
        });
        if (allDone) completedDays++;
      }

      if (completedDays >= challenge.durationDays) {
        changed = true;
        newlyCompleted = challenge.id;
        return { ...challenge, isComplete: true };
      }
      return challenge;
    });

    if (changed) {
      setChallenges(updated);
      if (newlyCompleted) setJustCompletedId(newlyCompleted);
    }
  }, [completions, loaded, habits]);

  const activeChallenge = useMemo(() => {
    const inProgress = challenges.find((c) => !c.isComplete);
    if (inProgress) return inProgress;
    return challenges.find((c) => c.isComplete && !c.rewardClaimed) || null;
  }, [challenges]);

  const createChallenge = useCallback(
    (name: string, habitIds: string[], durationDays: number) => {
      setChallenges((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name,
          habitIds,
          startDate: getToday(),
          durationDays,
          isComplete: false,
          rewardClaimed: false,
        },
      ]);
    },
    [],
  );

  const claimReward = useCallback((challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, rewardClaimed: true } : c)),
    );
  }, []);

  const forceComplete = useCallback((challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, isComplete: true } : c)),
    );
    setJustCompletedId(challengeId);
  }, []);

  const clearJustCompleted = useCallback(() => setJustCompletedId(null), []);

  if (!loaded) return null;

  return (
    <ChallengeContext.Provider
      value={{
        challenges,
        activeChallenge,
        justCompletedId,
        createChallenge,
        claimReward,
        clearJustCompleted,
        forceComplete,
        getChallengeProgress,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenges() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenges must be used within ChallengeProvider');
  return ctx;
}
