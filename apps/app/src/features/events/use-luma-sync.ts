import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userSettingsQueryKey } from '@/features/settings/use-user-settings';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { eventsQueryKey } from './use-events';

export type LumaSyncResult = {
  synced: number;
  newCount: number;
  enriched?: number;
  enrichError?: string;
  error?: string;
};

async function syncLuma(): Promise<LumaSyncResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured — Luma sync only runs against a real project.');
  }
  const { data, error } = await supabase!.functions.invoke<LumaSyncResult>('luma-sync');
  if (error) throw error;
  if (!data) throw new Error('No response from luma-sync.');
  return data;
}

export function useLumaSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncLuma,
    onSuccess: (result) => {
      // A business-level failure (e.g. no iCal URL yet) means nothing
      // actually changed server-side — only invalidate on genuine success.
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      queryClient.invalidateQueries({ queryKey: userSettingsQueryKey });
    },
  });
}
