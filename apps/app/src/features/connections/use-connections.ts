import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useEvents } from '@/features/events/use-events';
import type { Event } from '@/features/events/types';
import { isSupabaseConfigured } from '@/lib/supabase';

import { mockConnections } from './mock-data';
import type { Connection, ConnectionWithEvent } from './types';

export const connectionsQueryKey = ['connections'] as const;

// In-memory stand-in for the `connections` table, mirroring
// features/events/use-events.ts's mock/real seam exactly. No mutation
// hooks yet — the LinkedIn extension (Phase 5) is the only writer, and it
// goes straight to Supabase, so there's nothing to mutate in mock mode.
let mockStore: Connection[] = [...mockConnections];

async function fetchConnections(): Promise<Connection[]> {
  if (!isSupabaseConfigured) {
    return [...mockStore];
  }
  // TODO(Phase 5): supabase.from('connections').select('*').order('connected_on', { ascending: false })
  throw new Error('Supabase connection fetching is not wired up yet.');
}

export function useConnections() {
  return useQuery({ queryKey: connectionsQueryKey, queryFn: fetchConnections });
}

const EVENT_JOIN_STATUSES = new Set<Event['status']>(['went', 'going']);

// A day key ("Y-M-D") from either a date-only string ("2026-08-24") or a
// full timestamp — same concept calendar-view.tsx's private `dateKey`
// serves for events alone, duplicated locally here since this is only the
// second call site for it; this app's convention (see
// features/events/format.ts) is small local helpers over shared
// abstractions until reuse actually shows up a third time.
function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function connectedOnDayKey(connectedOn: string) {
  const [y, m, d] = connectedOn.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d));
}

// Client-side reproduction of the `connections_with_event` SQL view: joins
// each connection to every event on the same calendar day with status
// `went` or `going`. Deliberately a real join, not a lookup capped at one
// match — if two events land on the same day (the mock data has exactly
// this case), a connection dated that day produces one row per matching
// event, exactly as the SQL `join` would.
//
// Because this reads useEvents()'s query cache directly, swiping an event
// on the Dashboard (which invalidates that cache) automatically flows
// through here on the next render — no extra plumbing needed for the join
// to be "live".
export function useConnectionsWithEvents() {
  const connectionsQuery = useConnections();
  const eventsQuery = useEvents();

  const data = useMemo((): ConnectionWithEvent[] | undefined => {
    if (!connectionsQuery.data || !eventsQuery.data) return undefined;
    const eligibleEvents = eventsQuery.data.filter((event) => EVENT_JOIN_STATUSES.has(event.status));

    const results: ConnectionWithEvent[] = [];
    for (const connection of connectionsQuery.data) {
      const connKey = connectedOnDayKey(connection.connected_on);
      for (const event of eligibleEvents) {
        if (dayKey(new Date(event.starts_at)) === connKey) {
          results.push({
            ...connection,
            event_id: event.id,
            event_title: event.title,
            event_starts_at: event.starts_at,
          });
        }
      }
    }
    return results;
  }, [connectionsQuery.data, eventsQuery.data]);

  return {
    data,
    isLoading: connectionsQuery.isLoading || eventsQuery.isLoading,
    isError: connectionsQuery.isError || eventsQuery.isError,
  };
}
