# Tech Event Dashboard

Track the SF tech events you go to, what you learned there, and who you met — pulled together from
Luma and LinkedIn. See [Tech Dashboard PRD.md](./Tech%20Dashboard%20PRD.md) for the product spec, and
the "Build plan" section below for the full architecture writeup.

## Structure

```
apps/app         Expo Router app — one codebase for web, iOS, and Android
apps/extension   Companion browser extension (LinkedIn connections import) — Phase 4
supabase/        Postgres schema (migrations/), Edge Functions (functions/)
packages/shared  (optional) Supabase-generated TS types shared by app + functions
```

## Prerequisites

- Node 20+, [pnpm](https://pnpm.io)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- [Docker](https://www.docker.com/) — required for local Supabase (`supabase start`)

## Getting started

```bash
pnpm install

# Local Supabase (Postgres/Auth/Studio/Edge Functions), requires Docker running
pnpm db:start

# Copy env template and fill in the URL/anon key `supabase start` prints
cp apps/app/.env.example apps/app/.env.local

pnpm dev:web   # or: pnpm --filter app ios / android
```

Local dev email (magic links) is caught by Supabase's bundled Inbucket at `http://localhost:54324`
instead of sending real email.

## Build plan

The phased build plan (data model, sync design, extension design, milestones) lives at
[docs/build-plan.md](./docs/build-plan.md) — worth reading before starting a new phase.
