import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthResult = Promise<{ error: string | null }>;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => AuthResult;
  signIn: (email: string, password: string) => AuthResult;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (normalized.includes('user already registered')) return '이미 가입된 이메일이에요. 로그인해 보세요.';
  if (normalized.includes('password should be at least') || normalized.includes('weak password')) {
    return '비밀번호는 6자 이상으로 입력해 주세요.';
  }
  if (normalized.includes('unable to validate email') || normalized.includes('invalid email')) {
    return '이메일 형식을 확인해 주세요.';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout')
  ) {
    return '연결 상태를 확인하고 다시 시도해 주세요.';
  }
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    const appStateSubscription = Platform.OS === 'web' ? null : AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (Platform.OS !== 'web') supabase.auth.startAutoRefresh();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signUp: async (email, password) => {
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error ? getAuthError(error.message) : null };
      } catch (error) {
        return { error: getAuthError(error instanceof Error ? error.message : '') };
      }
    },
    signIn: async (email, password) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? getAuthError(error.message) : null };
      } catch (error) {
        return { error: getAuthError(error instanceof Error ? error.message : '') };
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
