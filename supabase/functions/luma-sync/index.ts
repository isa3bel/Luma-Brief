// Pulls the caller's events from their personal Luma iCal subscription feed
// into the `events` table, then enriches a batch of them from their public
// Luma pages (speakers/topics/venue type). See docs/build-plan.md for the
// overall design; the one real subtlety in the sync half is the upsert
// split below.
//
// Deliberately runs as the CALLING USER, not the service role: this
// function never needs to touch any other user's data, so there's no
// reason to hold a privileged key at all — RLS alone correctly scopes
// every query here. supabase.functions.invoke() on the client
// automatically forwards the caller's real session JWT in the
// Authorization header, which is what we build this scoped client from.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';
import { buildRawScrapeSnapshot, parseEventPage } from './parse-event-page.ts';
import { parseIcs } from './parse-ics.ts';

// Cap per sync run — politeness to Luma's servers and staying comfortably
// under Edge Function execution limits (real event pages ran 150-225KB
// each in testing). A larger backlog just self-heals over a few more
// sync runs rather than blocking on one huge run.
const MAX_ENRICH_PER_RUN = 10;

function normalizeIcsUrl(url: string): string {
  // Luma's "Subscribe" links use the webcal: scheme, which just tells a
  // calendar app "treat this as a calendar subscription" — it isn't a
  // fetchable protocol on its own.
  return url.replace(/^webcal:\/\//i, 'https://');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: 'Not authenticated' }, 401);

    const { data: settings, error: settingsErr } = await supabase
      .from('user_settings')
      .select('luma_ical_url')
      .eq('user_id', user.id)
      .maybeSingle();
    if (settingsErr) return json({ synced: 0, newCount: 0, error: settingsErr.message }, 200);

    if (!settings?.luma_ical_url) {
      return json({ synced: 0, newCount: 0, error: 'No iCal URL configured yet — add one in Settings.' }, 200);
    }

    const icsUrl = normalizeIcsUrl(settings.luma_ical_url);

    let icsText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const resp = await fetch(icsUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        return json({ synced: 0, newCount: 0, error: `Luma returned ${resp.status} fetching your calendar.` }, 200);
      }
      icsText = await resp.text();
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'AbortError'
          ? 'Timed out fetching your Luma calendar.'
          : `Couldn't reach Luma: ${String(e)}`;
      return json({ synced: 0, newCount: 0, error: msg }, 200);
    }

    let parsedEvents;
    try {
      parsedEvents = await parseIcs(icsText);
    } catch (e) {
      return json({ synced: 0, newCount: 0, error: `Couldn't parse your Luma calendar feed: ${String(e)}` }, 200);
    }

    const { data: existing, error: existingErr } = await supabase
      .from('events')
      .select('external_id')
      .eq('source', 'luma');
    if (existingErr) return json({ synced: 0, newCount: 0, error: existingErr.message }, 200);

    const existingIds = new Set((existing ?? []).map((r) => r.external_id));
    const nowIso = new Date().toISOString();

    const toInsert = parsedEvents.filter((e) => !existingIds.has(e.external_id));
    const toUpdate = parsedEvents.filter((e) => existingIds.has(e.external_id));

    if (toInsert.length > 0) {
      const rows = toInsert.map((e) => ({
        user_id: user.id,
        source: 'luma',
        external_id: e.external_id,
        title: e.title,
        description: e.description,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        location_name: e.location_name,
        is_virtual: false,
        luma_url: e.luma_url,
        raw_ical: e.raw_ical,
        // New events default to `going` (being on the user's own Luma
        // calendar implies they registered) unless already in the past at
        // first sync, in which case they need a swipe like anything else.
        status: e.starts_at < nowIso ? 'unresolved' : 'going',
      }));
      const { error } = await supabase.from('events').upsert(rows, { onConflict: 'user_id,source,external_id' });
      if (error) return json({ synced: 0, newCount: 0, error: error.message }, 200);
    }

    if (toUpdate.length > 0) {
      // `status` is deliberately absent from every object in this batch.
      // supabase-js's upsert becomes one INSERT ... ON CONFLICT DO UPDATE
      // SET statement whose SET clause is derived from the payload's own
      // keys — omitting `status` here means a re-sync can never clobber an
      // event the user already swiped Went / Did Not Go, even though these
      // rows go through the same ON CONFLICT branch as a fresh insert would.
      const rows = toUpdate.map((e) => ({
        user_id: user.id,
        source: 'luma',
        external_id: e.external_id,
        title: e.title,
        description: e.description,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        location_name: e.location_name,
        luma_url: e.luma_url,
        raw_ical: e.raw_ical,
      }));
      const { error } = await supabase.from('events').upsert(rows, { onConflict: 'user_id,source,external_id' });
      if (error) return json({ synced: 0, newCount: 0, error: error.message }, 200);
    }

    // Sweep: past pending/going -> unresolved. This is what populates the
    // swipe deck.
    const { error: sweepErr } = await supabase
      .from('events')
      .update({ status: 'unresolved' })
      .eq('source', 'luma')
      .in('status', ['pending', 'going'])
      .lt('starts_at', nowIso);
    if (sweepErr) {
      return json(
        { synced: toInsert.length + toUpdate.length, newCount: toInsert.length, error: sweepErr.message },
        200
      );
    }

    // Enrichment: fill in speakers/topics/venue-type for a batch of events
    // that don't have it yet, from each event's *public* Luma page. Never
    // touches title/description/starts_at/location_name — those are
    // already correctly sourced from the ICS feed above; this only fills
    // previously-empty fields. Nothing here can fail the sync overall —
    // every event is handled independently, and enriched_at is set
    // regardless of outcome so a dead link doesn't get retried forever.
    const { data: toEnrich, error: toEnrichErr } = await supabase
      .from('events')
      .select('id, luma_url')
      .eq('source', 'luma')
      .not('luma_url', 'is', null)
      .is('enriched_at', null)
      .limit(MAX_ENRICH_PER_RUN);

    let enrichedCount = 0;
    if (!toEnrichErr && toEnrich) {
      for (const event of toEnrich) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);
          const resp = await fetch(event.luma_url as string, { signal: controller.signal });
          clearTimeout(timeout);
          const html = resp.ok ? await resp.text() : '';
          const fields = html ? parseEventPage(html) : null;

          await supabase
            .from('events')
            .update({
              enriched_at: new Date().toISOString(),
              ...(fields
                ? {
                    speakers: fields.speakers,
                    topics: fields.topics,
                    is_virtual: fields.is_virtual,
                    location_address: fields.location_address,
                    cover_image_url: fields.cover_image_url,
                    raw_scrape: buildRawScrapeSnapshot(fields),
                  }
                : {}),
            })
            .eq('id', event.id);
          enrichedCount += 1;
        } catch {
          // Still mark enriched_at even on a fetch/parse failure — a
          // permanently-dead link shouldn't be retried on every future
          // sync forever.
          await supabase.from('events').update({ enriched_at: new Date().toISOString() }).eq('id', event.id);
        }
        // Small delay between requests — politeness to Luma's servers.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    await supabase.from('user_settings').update({ last_luma_sync_at: nowIso }).eq('user_id', user.id);

    return json(
      {
        synced: toInsert.length + toUpdate.length,
        newCount: toInsert.length,
        enriched: enrichedCount,
        // Surfaced only when something actually went wrong finding
        // candidates — a genuine query failure here shouldn't silently
        // read as "enriched 0" with no explanation.
        ...(toEnrichErr ? { enrichError: toEnrichErr.message } : {}),
      },
      200
    );
  } catch (e) {
    // Caught and returned with CORS headers rather than left to become a
    // bare 500 — an uncaught exception in Deno otherwise reaches the
    // browser as an opaque CORS error with no real message.
    return json({ synced: 0, newCount: 0, error: `Unexpected error: ${String(e)}` }, 200);
  }
});
