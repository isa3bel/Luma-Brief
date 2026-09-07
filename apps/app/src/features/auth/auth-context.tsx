import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isMockMode: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The redirect Supabase sends the magic-link email to. On web this is the
// app's own /auth/callback route; on native it's a deep link back into the
// app via the custom `scheme` set in app.json. Note: Expo Go's `exp://`
// scheme is dynamic per machine/session and can't be pre-registered in
// Supabase's redirect allow-list — native magic-link testing needs an
// expo-dev-client build instead.
function getRedirectTo() {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('/auth/callback');
}

// Stands in for a real Supabase session while no project is connected
// (isSupabaseConfigured is false — see lib/supabase.ts). Only the fields the
// app actually reads (session truthiness, user.email) need to be real; the
// rest is padding to satisfy the Session type.
function createMockSession(email: string): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: now + 60 * 60 * 24,
    user: {
      id: 'mock-user',
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  } as unknown as Session;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(!isSupabaseConfigured ? false : true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Native deep-link handling: web relies on detectSessionInUrl instead
  // (see lib/supabase.ts), so this listener is a no-op there.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || Platform.OS === 'web') return;
    const client = supabase;

    const handleUrl = async ({ url }: { url: string }) => {
      // Supabase's magic link redirect carries tokens in the URL *fragment*
      // (#access_token=...&refresh_token=...), not the query string, so
      // Linking.parse()'s queryParams won't see them — pull the fragment
      // apart by hand instead.
      const fragment = url.split('#')[1];
      if (!fragment) return;

      const fragmentParams = Object.fromEntries(new URLSearchParams(fragment));
      const { access_token, refresh_token, error_description } = fragmentParams;
      if (error_description) return;

      if (access_token && refresh_token) {
        await client.auth.setSession({ access_token, refresh_token });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isMockMode: !isSupabaseConfigured,
      signInWithMagicLink: async (email: string) => {
        if (!isSupabaseConfigured || !supabase) {
          // No backend connected yet — sign straight in with a mock session
          // instead of sending a real email, so UI work isn't blocked on
          // Supabase setup. See lib/supabase.ts.
          setSession(createMockSession(email));
          return { error: null };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: getRedirectTo() },
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (!isSupabaseConfigured || !supabase) {
          setSession(null);
          return;
        }
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
