import { Link, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AuthForm } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignUpScreen() {
  return <ThemedView style={styles.screen}><KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.heading}><ThemedText type="title">함께 시작해 볼까요?</ThemedText><ThemedText style={styles.subtitle}>부담 없이, 오늘 할 수 있는 만큼만 해요.</ThemedText></View>
    <AuthForm mode="signup" />
    <ThemedText style={styles.linkText}>이미 계정이 있으신가요? <Link href={'/(auth)/sign-in' as Href} style={styles.link}>로그인</Link></ThemedText>
  </KeyboardAvoidingView></ThemedView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { flex: 1, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' }, heading: { gap: 10, marginBottom: 32 }, subtitle: { opacity: 0.6 }, linkText: { textAlign: 'center', marginTop: 22, fontSize: 14 }, link: { color: '#0a7ea4', fontWeight: '700' } });
