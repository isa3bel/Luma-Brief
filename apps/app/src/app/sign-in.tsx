import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-context';

export default function SignIn() {
  const { session, isMockMode, signInWithMagicLink, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [codeError, setCodeError] = useState<string | null>(null);

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  const handleSubmit = async () => {
    setStatus('sending');
    setError(null);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus('error');
      setError(error);
    } else {
      setStatus('sent');
    }
  };

  const handleVerifyCode = async () => {
    setCodeStatus('verifying');
    setCodeError(null);
    const { error } = await verifyEmailOtp(email.trim(), code.trim());
    if (error) {
      setCodeStatus('error');
      setCodeError(error);
    }
    // On success, the session updates via onAuthStateChange and the
    // `if (session)` redirect above takes over — nothing else to do here.
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>We&apos;ll email you a magic link — no password needed.</Text>
        {isMockMode ? (
          <Text style={styles.mockNotice}>
            No Supabase project connected yet — this will sign you in with mock data instead of a
            real email link.
          </Text>
        ) : null}

        {status === 'sent' ? (
          <>
            <Text style={styles.sent}>Check {email} for a sign-in link.</Text>
            <Text style={styles.codeExplainer}>
              On a device where that link can&apos;t open the app (like Expo Go), enter the 6-digit
              code from the same email instead:
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
              style={styles.input}
            />
            {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
            <Pressable
              onPress={handleVerifyCode}
              disabled={codeStatus === 'verifying' || code.trim().length < 6}
              style={[
                styles.secondaryCta,
                (codeStatus === 'verifying' || code.trim().length < 6) && styles.ctaDisabled,
              ]}>
              <Text style={styles.secondaryCtaText}>
                {codeStatus === 'verifying' ? 'Verifying…' : 'Verify code'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={handleSubmit}
              disabled={status === 'sending' || !email.includes('@')}
              style={[styles.cta, (status === 'sending' || !email.includes('@')) && styles.ctaDisabled]}>
              <Text style={styles.ctaText}>{status === 'sending' ? 'Sending…' : 'Send magic link'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  card: { width: '100%', maxWidth: 360, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
  },
  cta: { backgroundColor: Colors.accent, paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: 13 },
  sent: { fontSize: 15, lineHeight: 22, color: Colors.text },
  codeExplainer: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary, marginTop: 4 },
  secondaryCta: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  secondaryCtaText: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
  mockNotice: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.noticeText,
    backgroundColor: Colors.noticeBg,
    padding: 10,
    borderRadius: Radius.sm,
  },
});
