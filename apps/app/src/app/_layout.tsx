import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/features/auth/auth-context';

// GestureHandlerRootView wraps the whole app up front even though nothing
// uses gestures yet — Phase 2's swipe-card deck needs it at the root, and
// it's a no-op cost to have in place early.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // "Refresh data on page load" (per the PRD) — refetch whenever a
      // screen using a query mounts or the app regains focus, rather than
      // trusting a stale cache.
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  // AdaptiveShell's nav icons render as empty "tofu" boxes until this
  // font actually loads — @expo/vector-icons ships the glyphs as a font,
  // it isn't preloaded automatically (web especially needs this explicit
  // load, or every icon shows its fallback glyph instead).
  const [iconsLoaded] = useFonts({ ...MaterialIcons.font });
  if (!iconsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Pinned to the light theme regardless of the device/browser's
              color scheme: every screen's colors (card backgrounds, text)
              are hand-picked for a light background and none of it has a
              dark counterpart yet. Following the system scheme here (as
              Expo's template does by default) would flip React
              Navigation's screen container to a dark background while the
              content stayed styled for light — unreadable dark-on-dark.
              Revisit once a real dark palette is designed. */}
          <ThemeProvider value={DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
