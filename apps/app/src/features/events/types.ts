// Mirrors the `events` table (supabase/migrations/0001_init.sql). Kept here
// as hand-written types for now; once Supabase is connected this can be
// replaced by `supabase gen types typescript` output in packages/shared.
export type EventStatus = 'pending' | 'going' | 'went' | 'did_not_go' | 'unresolved';

export type Speaker = { name: string; title?: string; company?: string; profile_url?: string };
export type Sponsor = { name: string; url?: string; logo_url?: string };

export type Event = {
  id: string;
  title: string;
  description?: string;
  starts_at: string; // ISO timestamp
  ends_at?: string;
  location_name?: string;
  location_address?: string;
  is_virtual: boolean;
  luma_url?: string;
  speakers: Speaker[];
  sponsors: Sponsor[];
  topics: string[];
  status: EventStatus;
  learnings?: string;
  linkedin_post_urn?: string;
  linkedin_posted_at?: string;
};
