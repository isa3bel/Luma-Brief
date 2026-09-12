# Luma Brief

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

## Known gotchas

- **`experiments.reactCompiler` is off** (`apps/app/app.json`), deliberately. It silently broke
  `@tanstack/react-table`'s controlled filter inputs on the Network page — typing into a filter box
  only ever showed the latest keystroke instead of accumulating, with no error or warning. The
  compiler appears to over-memoize across renders when a component reads through a library's
  getter-based API backed by external mutable state (tanstack's `header.column.getFilterValue()`),
  rather than plain props/state. If re-enabling this later, re-test the Network page's column
  filters specifically before trusting it elsewhere.

- **`web.output` is `"single"` (SPA), not `"static"`** (`apps/app/app.json`), deliberately. Every real
  screen is auth-gated and fetches from Supabase client-side after mount, and
  `dashboard/[eventId]` has no way to know event IDs at build time (they're per-user runtime data) —
  static pre-rendering has nothing to render for that route and no SEO benefit anyway for a personal,
  logged-in-only dashboard. `web.output: "single"` means the exported `dist/` is a true SPA (one
  `index.html`), so a static host needs a catch-all rewrite to `index.html` for client-side routes to
  survive a direct load/refresh — see `apps/app/vercel.json`.
