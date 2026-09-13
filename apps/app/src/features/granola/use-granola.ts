import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { eventsQueryKey } from '@/features/events/use-events';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type GranolaNoteCandidate = {
  id: string;
  title: string;
  createdAt: string;
  alreadyImported: boolean;
};

// Not cached under a shared query key — this is a one-off lookup scoped to
// whichever event's modal is currently open, not data any other screen
// needs to read, so there's no reuse to key off of.
export function useSearchGranolaNotes() {
  return useMutation({
    mutationFn: async (eventId: string): Promise<GranolaNoteCandidate[]> => {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase!.functions.invoke<{
        notes?: GranolaNoteCandidate[];
        error?: string;
      }>('granola-search-notes', { body: { eventId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.notes ?? [];
    },
  });
}

export function useImportGranolaNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, granolaNoteId }: { eventId: string; granolaNoteId: string }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase!.functions.invoke<{
        imported?: boolean;
        learnings?: string;
        error?: string;
      }>('granola-import-note', { body: { eventId, granolaNoteId } });
      if (error) throw error;
      if (!data?.imported) throw new Error(data?.error ?? 'Import failed.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsQueryKey }),
  });
}
