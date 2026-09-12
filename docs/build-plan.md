# LumaBrief — Build Plan

## Context

Since moving to SF, the user has been attending tech networking events discovered via Luma, tracked in their calendar via iCal, and turning into LinkedIn connections. Right now that's three disconnected sources with no place to capture *what they actually learned* at each event or *who* they met there. The [PRD](../../Library/CloudStorage/Dropbox/Code%20Projects/Tech-Event-Dashboard/Tech%20Dashboard%20PRD.md) asks for a single dashboard that pulls those three threads together: a swipeable "did I go" review flow, a calendar of upcoming events, per-event Learnings notes, and a Network table of people met, matched to the event they were met at.

The repo is currently empty (just the PRD and a blank README) — this is a from-scratch build. Two things make the architecture non-trivial and were decided with the user up front, since they shape everything else:

- **Mobile is a stated future goal**, not a someday-maybe — so the app is built as one universal **Expo Router (React Native + react-native-web)** codebase from day one, rather than a web app that gets rewritten later.
- **Luma and LinkedIn both require login** to see personal data, and there's no sanctioned personal API for either. Scraping either with stored credentials is fragile and against ToS. Instead: Luma is read via the user's own **personal iCal subscription feed** (plus fetching each event's *public* Luma page for richer details), and LinkedIn is read via a small **companion browser extension** the user runs manually on their own Connections page — no credentials ever touch the backend.

## Recommended Approach

### Repo layout (pnpm workspace)
```
luma-brief/
├── apps/
│   ├── app/            # Expo Router app — web + iOS + Android, one codebase
│   └── extension/      # separate MV3 browser extension (own toolchain, not Expo)
├── supabase/
│   ├── migrations/     # schema + RLS
│   └── functions/      # luma-sync, linkedin-ingest edge functions
└── packages/shared/     # (optional) generated Supabase TS types shared by app + functions
```
`apps/extension` intentionally has no dependency on the Expo toolchain — it's a plain TS + Vite MV3 extension.

### Data model (Supabase Postgres)
Favor `text` + `CHECK` over `ENUM` types, and a `metadata jsonb default '{}'` escape hatch on the main tables, since the PRD explicitly expects more fields/pages later.

- **`user_settings`**: `user_id` (PK/FK), `luma_ical_url`, `timezone`, `last_luma_sync_at`, `last_linkedin_ingest_at`.
- **`extension_tokens`**: `id`, `user_id`, `token_hash` (SHA-256; raw token shown once at creation, never stored), `label`, `last_used_at`, `revoked_at` — lets the browser extension authenticate as a specific user without ever holding a Supabase session.
- **`events`**: `user_id`, `source`, `external_id` (ICS `UID`), `luma_url`, `title`, `description`, `starts_at`/`ends_at`, `location_name`/`location_address`, `speakers`/`sponsors` (jsonb arrays), `topics` (text[]), `status` (`pending` / `going` / `went` / `did_not_go` / `unresolved`), `learnings`, `enriched_at`, `raw_ical`/`raw_scrape` (debug snapshots), `metadata`. Unique on `(user_id, source, external_id)` for idempotent upserts.
- **`connections`**: `user_id`, `full_name`, `headline` (raw), `role`/`company` (best-effort split of headline, user-editable), `linkedin_profile_url`, `connected_on` (date), `raw_scrape`, `metadata`. Unique on `(user_id, linkedin_profile_url)`.
- **`connections_with_event`** view (`security_invoker = true`): joins `connections` to `events` where `connected_on` matches the event's date and status is `went`/`going` — computed live rather than a stored FK, so re-swiping an event never leaves stale matches. The Network page only shows rows with a non-null `event_id`, per the PRD.
- RLS on every table: `user_id = auth.uid()` for select/insert/update/delete. The two edge functions use the service-role key but resolve `user_id` themselves (verified JWT for `luma-sync`, token-hash lookup for `linkedin-ingest`) before touching data.

### Auth
Supabase magic link (`signInWithOtp`) via a platform-aware Supabase client (`expo-secure-store` on native, `localStorage` on web). Web redirects to `/auth/callback` on the app's own origin; native uses a custom URL scheme + `expo-linking`, registered in Supabase's redirect allow-list. Note: native magic-link testing needs an `expo-dev-client` build, not Expo Go — Expo Go's `exp://` scheme is dynamic and can't be pre-registered.

### Luma sync (`supabase/functions/luma-sync`)
Runs on app load (satisfies "refresh on page load") and optionally on a `pg_cron` backstop:
1. Resolve user from JWT, read their `luma_ical_url`.
2. Fetch + parse the ICS feed (UID, title, start/end, location, URL); upsert into `events`.
3. Sweep: flip any `pending`/`going` event whose `starts_at` has passed to `unresolved` — this is what populates the swipe deck.
4. Enrichment: for events with a `luma_url` and no `enriched_at`, fetch the *public* event page and try to pull a structured JSON blob first (more stable than CSS selectors), falling back to selector scraping; wrap every field in its own try/catch so a broken selector never fails the sync, store partial data plus a raw snapshot for later reparsing, and mark `enriched_at` regardless so it doesn't retry forever.
- Caveat carried forward: anything beyond title/time/location (from the ICS feed itself) is best-effort scraped data and should always be optional in the UI, never load-bearing.

### LinkedIn extension (`apps/extension`)
Manifest V3, scoped to `linkedin.com/mynetwork/*`. User generates a personal access token once in the app's Settings page (raw token shown once, only its hash stored in `extension_tokens`) and pastes it into the extension popup. On the Connections page (sorted Recently Added, per PRD), the content script scrapes visible rows (name, headline text, "Connected on" date, profile URL) using structural/`aria-*` selectors rather than LinkedIn's hashed class names — these will need occasional maintenance as LinkedIn's markup shifts, which is inherent to any DOM-scraping approach. The popup shows a row count and a "Send to Dashboard" action; the background worker POSTs to `linkedin-ingest` with `Authorization: Bearer <token>`. The function hashes the token, resolves `user_id`, best-effort splits `headline` into `role`/`company`, and upserts into `connections`. The extension carries no event-matching logic — that all lives in the `connections_with_event` view server-side.

### Frontend (Expo Router)
```
app/
  index.tsx              # Landing (public), redirects signed-in users to /dashboard
  sign-in.tsx
  auth/callback.tsx
  (app)/_layout.tsx       # auth gate + AdaptiveShell
  (app)/dashboard/index.tsx        # SwipeDeck + blurred/unblurred future events
  (app)/dashboard/[eventId].tsx    # detail modal: speakers/sponsors/topics, Learnings, matched connections
  (app)/network/index.tsx          # sortable/filterable connections table
  (app)/settings/index.tsx         # iCal URL, extension token generation
```
- **Left rail**: a single `navItems.ts` config array drives an `AdaptiveShell` that renders a persistent `SideRail` (sign-out pinned last) on wide viewports, or bottom tabs/drawer on narrow ones, via a shared `useBreakpoint()` hook — adding a future page is a one-line config change.
- **SwipeDeck**: `react-native-gesture-handler` + `react-native-reanimated` (standard Tinder-card pattern: translateX/rotate driven by pan gesture, threshold fling, right→`went`, left→`did_not_go`); both libraries support react-native-web, but need `GestureHandlerRootView` at the root and correct Babel plugin ordering.
- **Blurred calendar section**: `expo-blur`'s `BlurView`, with a plain `opacity + pointerEvents="none"` fallback on web if `backdrop-filter` fidelity is lacking; gated on there being any `unresolved` past events.
- **Future events**: a grouped `SectionList` by month for MVP rather than a literal calendar grid — matches the PRD's actual requirement (see Pending/Going events) without building a calendar-grid widget up front.
- **Learnings**: debounced (~800ms) autosave + flush-on-blur, small "Saved" indicator.
- **Network table**: cross-platform data grids are the one place off-the-shelf web grids don't work (they don't run under react-native-web). Build a lightweight table on headless `@tanstack/react-table` for sort/filter state, with a custom renderer — real table rows on wide screens, stacked cards on narrow screens via the same `useBreakpoint()`. Dataset is personal-scale, so all sort/filter is client-side.
- **Data fetching**: TanStack Query around all Supabase reads/writes, with refetch-on-mount/foreground to satisfy the "refresh on page load" requirement.

### Keep-alive
A `pg_cron` job inside Supabase itself (no external infra):
```sql
select cron.schedule('keep-alive-ping', '0 12 */3 * *', $$ select now(); $$);
```

## Build Sequencing

1. **Scaffolding & auth** — pnpm workspace, Expo Router skeleton, `supabase init` + full schema/RLS migration, platform-aware Supabase client, Landing → magic link → auth-gated stub layout.
2. **Manual event CRUD + swipe UI** — seed past/future/unresolved events by hand, wire the real SwipeDeck to them, verify blur/unblur behavior and the future-events list.
3. **Luma iCal sync** — `luma-sync` function, Settings field for the iCal URL, wired to app-load refresh.
4. **Event detail + Learnings + enrichment** — detail route, autosave, extend sync with public-page scraping for speakers/sponsors/topics.
5. **Network page + extension + matching** — `connections` table/view, extension token generation, build the extension + `linkedin-ingest`, build the sortable/filterable table.
6. **Responsive/mobile polish** — AdaptiveShell across breakpoints, blur/table fallbacks, empty/error/loading states, a pass on iOS/Android simulators.
7. **Keep-alive + deploy** — `pg_cron` job, web hosting, production Supabase project + redirect URLs/secrets.

Each phase is independently demoable — e.g. Phase 2's swipe UI works against seeded data before Luma sync exists at all.

### Critical files
- `supabase/migrations/0001_init.sql` — full schema + RLS
- `apps/app/lib/supabase.ts` — platform-aware client
- `supabase/functions/luma-sync/index.ts` — ICS parse, upsert, sweep, enrichment
- `apps/app/features/events/SwipeDeck.tsx` — gesture-driven swipe cards
- `apps/app/features/nav/AdaptiveShell.tsx` — responsive left rail / bottom tabs
- `apps/extension/src/content-script.ts` — LinkedIn Connections scraping
- `supabase/functions/linkedin-ingest/index.ts` — token auth + upsert + headline split

## Verification

- **Local Supabase**: `supabase start` (Docker) for local Postgres/Auth/Studio/Edge Functions; `supabase db reset` to reapply migrations + seed data; inspect tables/RLS directly in Studio (`localhost:54323`).
- **Web UI**: `expo start --web` — RNGH supports mouse-drag emulation of the swipe gesture in a browser.
- **Native**: Expo Go is fine through the swipe/detail/network phases; switch to an `expo-dev-client` build once magic-link deep linking needs testing.
- **Auth**: use `supabase start`'s bundled Inbucket (`localhost:54324`) as a fake SMTP catcher to grab magic links without real email delivery in dev.
- **Luma sync**: pull ICS parsing and HTML enrichment into pure functions, unit-test against saved fixtures (a sample `.ics`, a saved Luma event-page HTML) independent of live network calls; then one manual smoke test against the real personal iCal URL.
- **Extension**: `chrome://extensions` → Developer mode → Load unpacked; test scraping against the real LinkedIn Connections page (read-only), pointed at local Supabase (`http://localhost:54321/functions/v1/linkedin-ingest`) before production.
- **Keep-alive**: confirm scheduled runs in `cron.job_run_details` / the Supabase dashboard.
- **Every phase**: close with a full smoke test — sign in → real data → the new phase's action → reload → confirm it persisted.
