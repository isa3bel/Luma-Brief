import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Gates the calendar section behind a blur until the user has resolved
// (Went / Did Not Go) every pending past event, per the PRD. BlurView's web
// fallback approximates backdrop-filter reasonably well in current Expo
// SDKs; if that ever looks off on a given browser, swap the BlurView here
// for a plain semi-opaque overlay instead — the locked/pointerEvents
// behavior below doesn't depend on which one is used.
export function BlurredSection({ locked, children }: PropsWithChildren<{ locked: boolean }>) {
  return (
    <View style={styles.container} pointerEvents={locked ? 'none' : 'auto'}>
      {children}
      {locked ? (
        <BlurView intensity={40} style={StyleSheet.absoluteFill}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayText}>Resolve the events above to see your calendar</Text>
          </View>
        </BlurView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Deliberately no flex:1 here — this wraps a calendar grid sized to its
  // own content now (not a flex-filling list), and RN views are relatively
  // positioned by default so the BlurView's absoluteFill below still sizes
  // itself to match without any extra styling.
  container: {},
  overlayContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayText: { fontSize: 14, color: '#3a3f42', fontWeight: '600', textAlign: 'center' },
});
