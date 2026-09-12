import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';
import { useLumaSync } from '@/features/events/use-luma-sync';
import { AdaptiveShell } from '@/features/nav/adaptive-shell';

// Gates every route under (app)/ behind a session, and wraps them in the
// adaptive left rail / bottom tabs shell.
export default function AppLayout() {
  const { session, isLoading } = useAuth();
  const lumaSync = useLumaSync();
  const hasSyncedRef = useRef(false);

  // Fires once per session, not on every tab switch — this layout mounts
  // once for the life of the authenticated session (dashboard/network/
  // settings unmount and remount under it via router.replace as sibling
  // tabs; this component doesn't). Satisfies "refresh data on page load"
  // without re-syncing every time the user just switches tabs. Silent on
  // failure here (e.g. no iCal URL saved yet) — Settings' own "Sync now"
  // surfaces real errors; this is just the ambient background refresh.
  useEffect(() => {
    if (!session || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    lumaSync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
