import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Real-Supabase-only — unlike events/connections/learnings, user_settings
// was never mocked (Settings was just a static stub until now), so there's
// no mock branch to preserve here.
export type UserSettings = {
  lumaIcalUrl: string | null;
  timezone: string;
  lastLumaSyncAt: string | null;
};

export const userSettingsQueryKey = ['user-settings'] as const;

async function fetchUserSettings(): Promise<UserSettings | null> {
  if (!isSupabaseConfigured) return null;
  const {
    data: { user },
  } = await supabase!.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase!
    .from('user_settings')
    .select('luma_ical_url, timezone, last_luma_sync_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  return {
    lumaIcalUrl: data?.luma_ical_url ?? null,
    timezone: data?.timezone ?? 'America/Los_Angeles',
    lastLumaSyncAt: data?.last_luma_sync_at ?? null,
  };
}

export function useUserSettings() {
  return useQuery({ queryKey: userSettingsQueryKey, queryFn: fetchUserSettings });
}

async function saveLumaIcalUrl(url: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const {
    data: { user },
  } = await supabase!.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  // Upsert, not update — the first save has no existing row yet (no other
  // path creates user_settings ahead of time).
  const { error } = await supabase!
    .from('user_settings')
    .upsert({ user_id: user.id, luma_ical_url: url }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function useSaveLumaIcalUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveLumaIcalUrl,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userSettingsQueryKey }),
  });
}
