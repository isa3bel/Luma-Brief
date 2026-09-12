import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/design';

// Parked deliberately: the table itself (features/connections/) is built
// and working against mock data, but LinkedIn has no good story for
// getting real connections data in without either an unofficial scraper
// (ToS/account-risk) or a third-party service that wants your session
// cookie — see docs/build-plan.md. Swap this screen back to
// <NetworkTable /> once that's actually resolved; nothing else needs to
// change.
export default function Network() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network</Text>
      <Text style={styles.body}>
        Coming soon — this page will show everyone you&apos;ve met at events, matched by date. It&apos;s
        on hold until there&apos;s a LinkedIn data source that doesn&apos;t require handing over your
        account credentials.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, maxWidth: 480 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  body: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
});
