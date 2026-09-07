import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';

// On web, supabase-js's detectSessionInUrl (lib/supabase.ts) already parses
// the magic-link tokens out of the URL by the time this screen mounts, so
// all that's left to do is wait for the session and bounce onward. Native
// completes the exchange via the deep-link listener in AuthProvider instead
// (this route still exists there so the redirect URL is valid to register).
export default function AuthCallback() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={session ? '/dashboard' : '/sign-in'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
