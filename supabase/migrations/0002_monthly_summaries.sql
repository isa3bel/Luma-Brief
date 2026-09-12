-- Learnings tab — persisted AI-generated monthly synthesis.
-- Stored (rather than regenerated on every view) so a month is never
-- re-summarized — and re-billed for an LLM call — unless the user
-- deliberately clicks Regenerate.

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  summary text not null,
  source_event_ids uuid[] not null default '{}',
  model text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists monthly_summaries_user_id_month_idx on public.monthly_summaries (user_id, month);

alter table public.monthly_summaries enable row level security;

create policy "monthly_summaries: owner select" on public.monthly_summaries
  for select using (user_id = auth.uid());
create policy "monthly_summaries: owner insert" on public.monthly_summaries
  for insert with check (user_id = auth.uid());
create policy "monthly_summaries: owner update" on public.monthly_summaries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "monthly_summaries: owner delete" on public.monthly_summaries
  for delete using (user_id = auth.uid());

-- Reuses the trigger function already defined in 0001_init.sql.
create trigger monthly_summaries_set_updated_at
  before update on public.monthly_summaries
  for each row execute function public.set_updated_at();
