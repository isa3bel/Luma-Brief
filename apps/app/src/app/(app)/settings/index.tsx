import { StyleSheet, Text, View } from 'react-native';

// Phase 0 stub — Phase 3 adds the Luma iCal URL field, Phase 4 adds
// extension token generation.
export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>Your Luma iCal URL and extension token will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, color: '#687076' },
});
