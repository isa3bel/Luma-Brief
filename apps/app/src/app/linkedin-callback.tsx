import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/design';

// LinkedIn redirects here after the user grants (or denies) access. In the
// normal case, expo-web-browser's openAuthSessionAsync (see
// features/linkedin/use-linkedin.ts) detects this exact URL being loaded
// and closes the browser/popup itself, resolving back in the code that
// opened it — which is what actually completes the connection. This page
// existing at all is mostly just so that redirect has somewhere real to
// land (and doesn't 404) if the browser renders it before that detection
// kicks in, or if something about a given browser's popup handling doesn't
// close it automatically.
export default function LinkedinCallback() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecting to LinkedIn…</Text>
      <Text style={styles.body}>
        This should close on its own in a moment. If it doesn&apos;t, you can close this tab and
        return to the app — check Settings to confirm the connection went through.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 360 },
});
