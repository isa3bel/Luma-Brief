import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isSupabaseConfigured } from '@/lib/supabase';

import { mockEvents } from './mock-data';
import type { Event, EventStatus } from './types';

export const eventsQueryKey = ['events'] as const;

// In-memory stand-in for the `events` table while no Supabase project is
// connected (see lib/supabase.ts / docs/build-plan.md Phase 3). Every hook
// below is written against the shape the real Supabase-backed version will
// have, so swapping the body out later shouldn't change any call sites.
let mockStore: Event[] = [...mockEvents];

async function fetchEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return [...mockStore];
  }
  // TODO(Phase 3): replace with a real Supabase query once a project is
  // connected — `supabase.from('events').select('*').order('starts_at')`.
  throw new Error('Supabase event fetching is not wired up yet.');
}

async function updateEventStatus(id: string, status: EventStatus): Promise<void> {
  if (!isSupabaseConfigured) {
    mockStore = mockStore.map((event) => (event.id === id ? { ...event, status } : event));
    return;
  }
  // TODO(Phase 3): supabase.from('events').update({ status }).eq('id', id)
  throw new Error('Supabase event updates are not wired up yet.');
}

async function updateLearnings(id: string, learnings: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mockStore = mockStore.map((event) => (event.id === id ? { ...event, learnings } : event));
    return;
  }
  // TODO(Phase 3): supabase.from('events').update({ learnings, learnings_updated_at: new Date().toISOString() }).eq('id', id)
  throw new Error('Supabase learnings updates are not wired up yet.');
}

export function useEvents() {
  return useQuery({ queryKey: eventsQueryKey, queryFn: fetchEvents });
}

// Derives a single event from the already-fetched list rather than issuing
// a separate query — the whole list is small (personal-scale data) and
// staying on one cache entry keeps a swipe/status update and a Learnings
// edit from ever disagreeing about the current event.
export function useEvent(id: string | undefined) {
  const query = useEvents();
  return {
    ...query,
    data: id ? query.data?.find((event) => event.id === id) : undefined,
  };
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) => updateEventStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsQueryKey }),
  });
}

export function useUpdateLearnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, learnings }: { id: string; learnings: string }) => updateLearnings(id, learnings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsQueryKey }),
  });
}
