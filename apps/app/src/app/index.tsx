import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-context';

export default function Landing() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>LumaBrief</Text>
        <Text style={styles.subtitle}>
          One place to remember every SF tech event you go to, what you learned there, and who you
          met — pulled together from Luma and LinkedIn so nothing falls through the cracks.
        </Text>
        <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}>
          <Text style={styles.ctaText}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { maxWidth: 480, gap: 16, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: Colors.text },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: Colors.textSecondary },
  cta: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: Radius.sm,
  },
  ctaText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },
});
