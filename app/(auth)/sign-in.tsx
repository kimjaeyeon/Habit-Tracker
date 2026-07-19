import { Link, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AuthForm } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignInScreen() {
  return <ThemedView style={styles.screen}><KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.heading}><ThemedText type="title">다시 만나서 반가워요 👋</ThemedText><ThemedText style={styles.subtitle}>오늘의 작은 습관을 이어가 볼까요?</ThemedText></View>
    <AuthForm mode="signin" />
    <ThemedText style={styles.linkText}>계정이 없으신가요? <Link href={'/(auth)/sign-up' as Href} style={styles.link}>회원가입</Link></ThemedText>
  </KeyboardAvoidingView></ThemedView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { flex: 1, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' }, heading: { gap: 10, marginBottom: 32 }, subtitle: { opacity: 0.6 }, linkText: { textAlign: 'center', marginTop: 22, fontSize: 14 }, link: { color: '#0a7ea4', fontWeight: '700' } });
