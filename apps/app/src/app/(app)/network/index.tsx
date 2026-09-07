import { StyleSheet, Text, View } from 'react-native';

// Phase 0 stub — Phase 4 replaces this with the sortable/filterable
// connections table backed by the connections_with_event view.
export default function Network() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network</Text>
      <Text style={styles.body}>People you met at events will show up here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, color: '#687076' },
});
