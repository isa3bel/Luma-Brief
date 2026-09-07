import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';
import { AdaptiveShell } from '@/features/nav/adaptive-shell';

// Gates every route under (app)/ behind a session, and wraps them in the
// adaptive left rail / bottom tabs shell.
export default function AppLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <AdaptiveShell>
      <Stack screenOptions={{ headerShown: false }} />
    </AdaptiveShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
