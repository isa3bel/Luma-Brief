---
name: run-web
description: Build, run, and drive the Tech Event Dashboard web app (apps/app, Expo Router). Use when asked to start the app, take a screenshot of it, or verify a UI change actually works in the browser.
---

The app is Expo Router served on web via Metro (`expo start --web`). There's no
headless `chromium-cli` in this environment, so it's driven with a small
Playwright REPL at `.claude/skills/run-web/driver.mjs`.

All paths below are relative to the repo root.

## Prerequisites (one-time)

```bash
pnpm install                       # installs playwright-core (root devDependency)
npx playwright install chromium    # downloads the Chromium binary
```

## Run

```bash
# 1. Start the dev server in the background
cd apps/app
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill 2>/dev/null   # free the port first
nohup npx expo start --web --port 8081 > /tmp/expo-dev-server.log 2>&1 &

# 2. Poll for it to actually be serving (don't `sleep N` blind)
for i in $(seq 1 60); do curl -sf http://localhost:8081 >/dev/null 2>&1 && break; sleep 1; done

# 3. Drive it
cd ../..   # back to repo root
node .claude/skills/run-web/driver.mjs
```

Stop the dev server when done: `lsof -ti:8081 -sTCP:LISTEN | xargs -r kill`.

### Driver commands

| command | what it does |
|---|---|
| `launch [width] [height]` | launch headless Chromium (default 1280x900; use e.g. `launch 390 844` for a phone-width check) |
| `nav [url]` | navigate (default `http://localhost:8081/`) |
| `wait-for <text>` | wait up to 15s for text to appear on the page |
| `click <exact text>` | click the first element with that exact text |
| `fill <selector> <text>` | fill a form field (e.g. `fill input[placeholder="you@example.com"] test@example.com`) |
| `screenshot [name]` | save PNG to `/tmp/shots/<name>.png` (override dir: `SCREENSHOT_DIR`) |
| `text [selector]` | print innerText (default `body`) |
| `console --errors` | print collected console/page errors since launch |
| `quit` | close the browser |

### One representative flow (sign-in → dashboard)

No Supabase project is required for this — the app runs in a built-in "mock
mode" until `apps/app/.env.local` has real Supabase values (see
`apps/app/.env.example`), and signs straight in with mock data instead of
sending a real magic-link email.

```
launch
nav http://localhost:8081/
wait-for Tech Event Dashboard
screenshot 01-landing
click Sign in
wait-for magic link
fill input[placeholder="you@example.com"] test@example.com
click Send magic link
wait-for Did you go?
screenshot 02-dashboard
console --errors
quit
```

To exercise the swipe-to-resolve flow, click the corner buttons instead of
using `click <text>` (they're icon-only) — for a one-off script use Playwright
directly with `page.locator('[aria-label="Went"]').first().click()`, or add a
`click-sel <css-selector>` command to the driver if this becomes a repeated
need.

## Gotchas

- **`timeout` isn't available on macOS by default** (no GNU coreutils) — use
  a polling loop (`for i in $(seq 1 N); do ...; sleep 1; done`) instead of
  `timeout N cmd` when waiting on the dev server.
- **The AdaptiveShell nav (left rail vs. bottom tabs) switches at 768px
  width** (`apps/app/src/hooks/use-breakpoint.ts`) — `launch 390 844` is a
  good way to sanity-check the narrow layout.
- **`kill` the port, not `pkill -f expo`** — a broad pkill pattern can match
  unrelated processes on a shared dev machine.
