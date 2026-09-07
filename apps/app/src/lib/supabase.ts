import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Platform-aware session storage: SecureStore on native, localStorage on web
// (available under react-native-web). Supabase's client only needs
// get/set/removeItem, so this is a minimal adapter rather than a full
// storage library.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Until a real Supabase project is wired up, the app runs in "mock mode":
// AuthProvider skips real auth (see features/auth/auth-context.tsx) and the
// data hooks under features/*/use-*.ts read/write an in-memory mock store
// instead of Supabase. This lets UI work (Phase 1+) proceed without a
// backend, with a single seam to swap over once Supabase is connected.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        // Only parse the magic-link redirect URL on web; native handles it
        // via a deep-link listener instead (see auth-context.tsx).
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
