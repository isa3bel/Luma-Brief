// Pure ICS-text -> row-shaped mapping, kept separate from index.ts so it can
// be sanity-checked against a fixture independent of any live HTTP call or
// Deno deploy. Line folding, \, \; \n escaping, and UTC vs TZID datetimes
// were validated against a hand-written fixture with node-ical@0.20.1; the
// luma_url/location_name logic below was corrected against a real user's
// live feed after the hand-written fixture's guess (lu.ma-only, no /join/
// exclusion) turned out wrong on 100% of 73 real events — see the two
// functions' comments for exactly what a real feed actually contains.
//
// Deliberately pinned to 0.20.1 rather than `latest` (0.27.1 at time of
// writing) — the 0.27 line requires Node >=22 and a still-stabilizing
// Temporal-API rewrite; 0.20.1 is the mature pure-JS line (moment-timezone
// based), safer for an edge sandbox with no local test loop.
import ical from 'npm:node-ical@0.20.1';

export type ParsedLumaEvent = {
  external_id: string;
  title: string;
  description?: string;
  starts_at: string; // ISO
  ends_at?: string;
  location_name?: string;
  luma_url?: string;
  raw_ical: Record<string, unknown>;
};

// Real Luma feeds (confirmed against a live personal iCal export) use the
// luma.com domain in descriptions, not lu.ma — and often include *two*
// links: the public event page ("Get up-to-date information at:
// https://luma.com/some-slug?pk=...") and a separate "Click to join:
// https://luma.com/join/<code>" link for virtual events. Only the former
// is a fetchable public event page, so /join/ links are explicitly
// excluded rather than just taking whichever link appears first.
function extractLumaUrlFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const match = text.match(/https:\/\/(?:lu\.ma|luma\.com)\/(?!join\/)[^\s)>\]]+/);
  if (!match) return undefined;
  // Strip a trailing tracking query string (?pk=...) and any punctuation
  // immediately following the URL in prose text.
  return match[0].split('?')[0].replace(/[.,;]+$/, '');
}

// A virtual event's ICS LOCATION is often itself a Luma "join" link
// (confirmed against a live feed) — showing a raw URL as a "place" reads
// badly, so it's dropped rather than stored as location_name.
function cleanLocationName(location: string | undefined): string | undefined {
  if (!location) return undefined;
  return /^https?:\/\//i.test(location) ? undefined : location;
}

export async function parseIcs(icsText: string): Promise<ParsedLumaEvent[]> {
  const parsed = await ical.async.parseICS(icsText);
  const events: ParsedLumaEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const v = parsed[key];
    if (v.type !== 'VEVENT') continue;
    if (!v.uid) continue; // no stable conflict key to upsert on — skip rather than fabricate one

    const startsAt = new Date(v.start).toISOString();
    const endsAt = v.end ? new Date(v.end).toISOString() : undefined;

    events.push({
      external_id: v.uid,
      title: v.summary ?? 'Untitled event',
      description: v.description || undefined,
      starts_at: startsAt,
      ends_at: endsAt,
      location_name: cleanLocationName(v.location),
      // Real Luma feeds have no URL: property at all (confirmed) — the
      // event page link only shows up embedded in the description text.
      luma_url: v.url || extractLumaUrlFromText(v.description),
      // Hand-built plain object rather than storing `v` itself — node-ical's
      // VEVENT objects can carry non-JSON-safe internal timezone-component
      // references, which is a bad thing to shove straight into a jsonb
      // column.
      raw_ical: {
        uid: v.uid,
        summary: v.summary ?? null,
        description: v.description ?? null,
        location: v.location ?? null,
        url: v.url ?? null,
        start: startsAt,
        end: endsAt ?? null,
      },
    });
  }

  return events;
}
