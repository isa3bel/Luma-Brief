-- Granola — personal API key (Settings -> Connectors -> API keys in the
-- Granola app; a plain bearer token, no OAuth dance unlike LinkedIn) plus
-- a record of which Granola notes have been imported into which event.
-- A join/tracking table, not a single column on events, because one event
-- can have several associated notes over time (e.g. a pre-call and the
-- event itself), not just one.
alter table public.user_settings add column if not exists granola_api_key text;

create table if not exists public.granola_note_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  granola_note_id text not null,
  granola_note_title text,
  granola_note_created_at timestamptz,
  imported_at timestamptz not null default now(),
  -- Same note can't be imported into the same event twice — re-importing
  -- would just duplicate the same summary text in Learnings.
  unique (event_id, granola_note_id)
);

create index if not exists granola_note_imports_event_id_idx on public.granola_note_imports (event_id);

alter table public.granola_note_imports enable row level security;

create policy "granola_note_imports: owner select" on public.granola_note_imports
  for select using (user_id = auth.uid());
create policy "granola_note_imports: owner insert" on public.granola_note_imports
  for insert with check (user_id = auth.uid());
create policy "granola_note_imports: owner delete" on public.granola_note_imports
  for delete using (user_id = auth.uid());
