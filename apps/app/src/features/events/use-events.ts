import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { mockEvents } from './mock-data';
import type { Event, EventStatus } from './types';

export const eventsQueryKey = ['events'] as const;

// In-memory stand-in for the `events` table while no Supabase project is
// connected (see lib/supabase.ts / docs/build-plan.md Phase 3). Every hook
// below is written against the shape the real Supabase-backed version will
// have, so swapping the body out later shouldn't change any call sites.
let mockStore: Event[] = [...mockEvents];

// Column list matches the Event type field-for-field (see types.ts's
// comment — it was written to mirror this table exactly), so the rows
// Supabase returns can be cast straight to Event with no mapping step.
const EVENT_COLUMNS =
  'id, title, description, starts_at, ends_at, location_name, location_address, is_virtual, luma_url, speakers, sponsors, topics, status, learnings, linkedin_post_urn, linkedin_posted_at';

async function fetchEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return [...mockStore];
  }
  const { data, error } = await supabase!
    .from('events')
    .select(EVENT_COLUMNS)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Event[];
}

async function updateEventStatus(id: string, status: EventStatus): Promise<void> {
  if (!isSupabaseConfigured) {
    mockStore = mockStore.map((event) => (event.id === id ? { ...event, status } : event));
    return;
  }
  const { error } = await supabase!.from('events').update({ status }).eq('id', id);
  if (error) throw error;
}

async function updateLearnings(id: string, learnings: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mockStore = mockStore.map((event) => (event.id === id ? { ...event, learnings } : event));
    return;
  }
  const { error } = await supabase!
    .from('events')
    .update({ learnings, learnings_updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
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
