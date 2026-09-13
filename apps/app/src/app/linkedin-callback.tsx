import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from '@/constants/design';

// LinkedIn redirects here after the user grants (or denies) access. This
// page's only real job is calling WebBrowser.maybeCompleteAuthSession() —
// without it, expo-web-browser's openAuthSessionAsync has no way to know
// the popup ever got here at all: on web it isn't polling this page's URL
// from the opener (that's blocked cross-origin anyway), it's waiting for
// *this page* to read the redirect back out of localStorage and
// postMessage it to window.opener. Confirmed against a real failed
// connection attempt: without this call the popup just sits open forever,
// and manually closing it reports "cancelled" — it's not a timing issue,
// nothing was ever going to complete it.
export default function LinkedinCallback() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecting to LinkedIn…</Text>
      <Text style={styles.body}>This should close on its own in a moment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 360 },
});
