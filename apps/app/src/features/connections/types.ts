// Mirrors the `connections` table (supabase/migrations/0001_init.sql). Kept
// here as hand-written types for now; once Supabase is connected this can be
// replaced by `supabase gen types typescript` output in packages/shared.
export type Connection = {
  id: string;
  full_name: string;
  headline?: string;
  role?: string;
  company?: string;
  linkedin_profile_url: string;
  connected_on: string; // date-only, e.g. "2026-08-24" — no time component
  metadata: Record<string, unknown>;
};

// Mirrors the `connections_with_event` view. Its join is an inner join
// gated on event status, so every row here always has a matched event —
// there's no "unmatched" variant of this type. Connections with no
// qualifying event simply never produce a row at all (see
// use-connections.ts), same as the SQL view.
export type ConnectionWithEvent = Connection & {
  event_id: string;
  event_title: string;
  event_starts_at: string; // ISO timestamp, mirrors Event['starts_at']
};
