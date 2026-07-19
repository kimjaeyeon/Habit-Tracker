import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const buttonText = useThemeColor({}, 'buttonText');
  const border = useThemeColor({ light: '#d8dde0', dark: '#3b4145' }, 'background');

  const submit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return setError('이메일 형식을 확인해 주세요.');
    if (password.length < 6) return setError('비밀번호는 6자 이상으로 입력해 주세요.');

    setError(null);
    setSubmitting(true);
    try {
      const result = await (mode === 'signin' ? signIn(trimmedEmail, password) : signUp(trimmedEmail, password));
      setError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput
        accessibilityLabel="이메일"
        style={[styles.input, { borderColor: border, color: text }]}
        placeholder="이메일"
        placeholderTextColor="#8a9297"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!submitting}
      />
      <TextInput
        accessibilityLabel="비밀번호"
        style={[styles.input, { borderColor: border, color: text }]}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor="#8a9297"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        onSubmitEditing={submit}
        editable={!submitting}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={submit}
        style={({ pressed }) => [styles.button, { backgroundColor: tint }, (pressed || submitting) && styles.dimmed]}
      >
        {submitting ? <ActivityIndicator color={buttonText} /> : (
          <ThemedText style={[styles.buttonText, { color: buttonText }]}>
            {mode === 'signin' ? '로그인' : '가입하고 시작하기'}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, width: '100%' },
  input: { height: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
  error: { color: '#d64545', fontSize: 14, lineHeight: 20 },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  dimmed: { opacity: 0.7 },
});
