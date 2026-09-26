import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';

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
            <View style={styles.lockBadge}>
              <MaterialIcons name="lock-outline" size={20} color={Colors.accent} />
            </View>
            <Text style={styles.overlayText}>Review your past events above to unlock your calendar</Text>
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
  container: { borderRadius: Radius.card, overflow: 'hidden' },
  overlayContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px -2px rgba(23, 24, 27, 0.2)',
  },
  overlayText: { fontSize: 14, color: Colors.text, fontWeight: '600', textAlign: 'center' },
});
