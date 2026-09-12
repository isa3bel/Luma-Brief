-- LinkedIn — OAuth connection storage + post-tracking for the "Share on
-- LinkedIn" feature (draft a post from an event's Learnings, edit, post).
--
-- Access tokens here are the standard 3-legged OAuth kind (member-scoped,
-- ~60 day lifetime) — LinkedIn's self-serve tier has no refresh token for
-- this flow, so re-connecting periodically via Settings is expected
-- behavior, not a bug to fix later.
create table if not exists public.linkedin_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  expires_at timestamptz not null,
  -- "urn:li:person:{id}" — the exact author URN the Posts API needs;
  -- storing it pre-built avoids re-deriving it from member_id on every post.
  member_urn text not null,
  member_name text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.linkedin_connections enable row level security;

create policy "linkedin_connections: owner select" on public.linkedin_connections
  for select using (user_id = auth.uid());
create policy "linkedin_connections: owner insert" on public.linkedin_connections
  for insert with check (user_id = auth.uid());
create policy "linkedin_connections: owner update" on public.linkedin_connections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "linkedin_connections: owner delete" on public.linkedin_connections
  for delete using (user_id = auth.uid());

-- Reuses the trigger function already defined in 0001_init.sql.
create trigger linkedin_connections_set_updated_at
  before update on public.linkedin_connections
  for each row execute function public.set_updated_at();

-- Tracks whether/where an event was already shared, so the event detail
-- page can show "Posted" (with a link to the real post) instead of
-- re-offering Share, and so a re-click can't accidentally double-post.
alter table public.events add column if not exists linkedin_post_urn text;
alter table public.events add column if not exists linkedin_posted_at timestamptz;
