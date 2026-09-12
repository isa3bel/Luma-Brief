import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { eventsQueryKey } from '@/features/events/use-events';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// LinkedIn's OAuth redirect_uri must be an exact https URL pre-registered
// in the LinkedIn Developer App's "Authorized redirect URLs" (it does not
// accept custom schemes like tech-event-dashboard://, which is what rules
// this out for the same reason Expo Go's exp:// deep link was ruled out
// for Supabase's magic link — see auth-context.tsx). Using the same fixed
// production URL from every platform (including native, opened in an
// in-app browser) sidesteps that entirely: one registered URL, works
// everywhere. Add http://localhost:8081/linkedin-callback too in the
// LinkedIn app console if you want to test this from a local web build.
const LINKEDIN_REDIRECT_URI = 'https://luma-brief.vercel.app/linkedin-callback';

export type LinkedinConnection = { connected: boolean; memberName: string | null; expiresAt: string | null };

export const linkedinConnectionQueryKey = ['linkedin-connection'] as const;

async function fetchLinkedinConnection(): Promise<LinkedinConnection> {
  if (!isSupabaseConfigured) return { connected: false, memberName: null, expiresAt: null };
  const {
    data: { user },
  } = await supabase!.auth.getUser();
  if (!user) return { connected: false, memberName: null, expiresAt: null };

  const { data, error } = await supabase!
    .from('linkedin_connections')
    .select('member_name, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { connected: false, memberName: null, expiresAt: null };

  return { connected: true, memberName: data.member_name, expiresAt: data.expires_at };
}

export function useLinkedinConnection() {
  return useQuery({ queryKey: linkedinConnectionQueryKey, queryFn: fetchLinkedinConnection });
}

// Opens LinkedIn's real OAuth consent screen (openid + profile to identify
// the member, w_member_social to post on their behalf later), waits for it
// to redirect back to LINKEDIN_REDIRECT_URI with ?code=..., then hands that
// code to the linkedin-connect edge function — which is the only place
// LINKEDIN_CLIENT_SECRET ever gets used, never on the client.
export function useConnectLinkedin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured — LinkedIn connect only runs against a real project.');
      }
      const clientId = process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_ID;
      if (!clientId) {
        throw new Error('LinkedIn is not configured — missing EXPO_PUBLIC_LINKEDIN_CLIENT_ID.');
      }

      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI);
      authUrl.searchParams.set('scope', 'openid profile w_member_social');

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), LINKEDIN_REDIRECT_URI);
      if (result.type !== 'success' || !result.url) {
        throw new Error('LinkedIn connection was cancelled.');
      }

      const redirected = new URL(result.url);
      const code = redirected.searchParams.get('code');
      const errorDescription = redirected.searchParams.get('error_description');
      if (!code) {
        throw new Error(errorDescription ?? 'LinkedIn did not return an authorization code.');
      }

      const { data, error } = await supabase!.functions.invoke<{ connected?: boolean; error?: string }>(
        'linkedin-connect',
        { body: { code, redirectUri: LINKEDIN_REDIRECT_URI } }
      );
      if (error) throw error;
      if (!data?.connected) throw new Error(data?.error ?? 'Could not connect LinkedIn.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linkedinConnectionQueryKey }),
  });
}

export function useDraftLinkedinPost() {
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase!.functions.invoke<{ draft?: string; error?: string }>(
        'draft-linkedin-post',
        { body: { eventId } }
      );
      if (error) throw error;
      if (!data?.draft) throw new Error(data?.error ?? 'The draft came back empty.');
      return data.draft;
    },
  });
}

export function usePostToLinkedin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, text }: { eventId: string; text: string }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase!.functions.invoke<{ posted?: boolean; postUrl?: string; error?: string }>(
        'post-to-linkedin',
        { body: { eventId, text } }
      );
      if (error) throw error;
      if (!data?.posted) throw new Error(data?.error ?? 'LinkedIn did not confirm the post.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsQueryKey }),
  });
}
