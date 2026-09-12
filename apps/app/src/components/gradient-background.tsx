import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Colors, StatusColors } from '@/constants/design';

// Soft ambient gradient glow, modeled on the ".gradient-bg" treatment on
// Luma's own sign-in page (a fixed, cover-sized, heavily blurred image).
// React Native has neither a real blur filter nor a radial-gradient
// primitive, so this fakes both: a few oversized circles, each filled
// with a linear gradient fading from a brand color to fully transparent —
// a gradient-to-transparent circle reads as a soft glow with no hard
// edge, which is what actually sells the "blurred blob" look here, not
// literal blur.
//
// Render this as a sibling *before* a screen's ScrollView (not inside
// it), absolutely filling their shared parent — that keeps it fixed
// behind the content as the page scrolls, the RN equivalent of the
// reference CSS's `position: fixed`.
export function GradientBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={[Colors.accent, 'transparent']}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[styles.blob, styles.blobTopLeft]}
      />
      <LinearGradient
        colors={[StatusColors.went.bg, 'transparent']}
        start={{ x: 0.7, y: 0.3 }}
        end={{ x: 0.1, y: 1 }}
        style={[styles.blob, styles.blobBottomRight]}
      />
      <LinearGradient
        colors={[Colors.navGradientTop, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.blob, styles.blobCenter]}
      />
    </View>
  );
}

const BLOB_SIZE = 560;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
    opacity: 0.35,
  },
  blobTopLeft: { top: -BLOB_SIZE * 0.35, left: -BLOB_SIZE * 0.3 },
  blobBottomRight: { bottom: -BLOB_SIZE * 0.4, right: -BLOB_SIZE * 0.25 },
  blobCenter: { top: '20%', left: '50%', marginLeft: -BLOB_SIZE / 2, opacity: 0.2 },
});
