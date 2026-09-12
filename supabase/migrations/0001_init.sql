-- LumaBrief — initial schema
-- Tables favor text + CHECK over enum types, and a jsonb `metadata` escape
-- hatch, since the product is expected to grow new fields/pages over time.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  luma_ical_url text,
  timezone text not null default 'America/Los_Angeles',
  last_luma_sync_at timestamptz,
  last_linkedin_ingest_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: owner select" on public.user_settings
  for select using (user_id = auth.uid());
create policy "user_settings: owner insert" on public.user_settings
  for insert with check (user_id = auth.uid());
create policy "user_settings: owner update" on public.user_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings: owner delete" on public.user_settings
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- extension_tokens — lets the LinkedIn browser extension authenticate as a
-- specific user without ever holding a Supabase session. Only the hash of
-- the raw token is stored; the raw value is shown once at creation time.
-- ---------------------------------------------------------------------------
create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists extension_tokens_user_id_idx on public.extension_tokens (user_id);

alter table public.extension_tokens enable row level security;

create policy "extension_tokens: owner select" on public.extension_tokens
  for select using (user_id = auth.uid());
create policy "extension_tokens: owner insert" on public.extension_tokens
  for insert with check (user_id = auth.uid());
create policy "extension_tokens: owner update" on public.extension_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "extension_tokens: owner delete" on public.extension_tokens
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'luma' check (source in ('luma', 'manual')),
  external_id text,
  luma_url text,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  location_address text,
  is_virtual boolean not null default false,
  cover_image_url text,
  speakers jsonb not null default '[]'::jsonb,
  sponsors jsonb not null default '[]'::jsonb,
  topics text[] not null default '{}'::text[],
  status text not null default 'unresolved'
    check (status in ('pending', 'going', 'went', 'did_not_go', 'unresolved')),
  learnings text,
  learnings_updated_at timestamptz,
  enriched_at timestamptz,
  raw_ical jsonb,
  raw_scrape jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index if not exists events_user_id_starts_at_idx on public.events (user_id, starts_at);
create index if not exists events_user_id_status_idx on public.events (user_id, status);

alter table public.events enable row level security;

create policy "events: owner select" on public.events
  for select using (user_id = auth.uid());
create policy "events: owner insert" on public.events
  for insert with check (user_id = auth.uid());
create policy "events: owner update" on public.events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "events: owner delete" on public.events
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- connections
-- ---------------------------------------------------------------------------
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  headline text,
  role text,
  company text,
  linkedin_profile_url text not null,
  connected_on date not null,
  raw_scrape jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, linkedin_profile_url)
);

create index if not exists connections_user_id_connected_on_idx on public.connections (user_id, connected_on);

alter table public.connections enable row level security;

create policy "connections: owner select" on public.connections
  for select using (user_id = auth.uid());
create policy "connections: owner insert" on public.connections
  for insert with check (user_id = auth.uid());
create policy "connections: owner update" on public.connections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "connections: owner delete" on public.connections
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- connections_with_event — computed match between a connection and the event
-- the user was at on that same day. Deliberately not a stored foreign key:
-- re-swiping an event's Went/Did Not Go status should never leave a stale
-- match behind, so this is recomputed on every read instead.
-- security_invoker makes the view respect the underlying tables' RLS as the
-- querying user, so no separate view-level policy is needed.
-- ---------------------------------------------------------------------------
create or replace view public.connections_with_event
  with (security_invoker = true) as
select
  c.*,
  e.id as event_id,
  e.title as event_title,
  e.starts_at as event_starts_at
from public.connections c
join public.events e
  on e.user_id = c.user_id
 and e.status in ('went', 'going')
 and (e.starts_at at time zone coalesce(e.metadata ->> 'tz', 'UTC'))::date = c.connected_on;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();
