// Extracts speaker/topic/venue-type details from a Luma event's *public*
// page. Found by actually fetching and inspecting 3 real Luma event pages
// (one in-person, one Zoom-hosted, one general meetup) rather than
// guessing: they're server-rendered Next.js pages carrying a single
// `__NEXT_DATA__` <script> tag with the full page payload as JSON — no
// CSS-selector scraping needed at all, just parse that one blob.
//
// No `sponsors` field exists anywhere in that payload on any of the 3
// samples checked — this is a real Luma platform limitation, not
// something worth a fragile text-guessing heuristic. Sponsors stay
// unpopulated; nothing here tries to invent them.
export type EnrichedEventFields = {
  speakers: { name: string; title?: string; profile_url?: string }[];
  topics: string[];
  is_virtual: boolean;
  location_address?: string;
  cover_image_url?: string;
};

type LumaHost = {
  name?: string;
  bio_short?: string;
  linkedin_handle?: string;
  website?: string;
};

type LumaCategory = { name?: string };

function extractSpeakers(hosts: unknown): EnrichedEventFields['speakers'] {
  if (!Array.isArray(hosts)) return [];
  const speakers: EnrichedEventFields['speakers'] = [];
  for (const raw of hosts) {
    try {
      const h = raw as LumaHost;
      if (!h?.name) continue;
      speakers.push({
        name: h.name,
        // bio_short is Luma's own freeform one-liner (e.g. "Codex @
        // OpenAI") — not cleanly splittable into separate title/company
        // fields, so it's kept as-is rather than guessed apart.
        title: h.bio_short || undefined,
        profile_url: h.linkedin_handle ? `https://linkedin.com${h.linkedin_handle}` : h.website || undefined,
      });
    } catch {
      // One malformed host entry shouldn't drop the rest.
      continue;
    }
  }
  return speakers;
}

function extractTopics(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  const topics: string[] = [];
  for (const raw of categories) {
    try {
      const c = raw as LumaCategory;
      if (c?.name) topics.push(c.name);
    } catch {
      continue;
    }
  }
  return topics;
}

// Every field extraction below is independently try/caught — a future
// Luma frontend change breaking one field's shape shouldn't lose the
// others, matching parse-ics.ts's "partial data is fine" principle.
export function parseEventPage(html: string): EnrichedEventFields | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(match[1]);
  } catch {
    return null;
  }

  // deno-lint-ignore no-explicit-any
  const d = (payload as any)?.props?.pageProps?.initialData?.data;
  if (!d?.event) return null;

  const result: EnrichedEventFields = {
    speakers: [],
    topics: [],
    is_virtual: false,
    location_address: undefined,
    cover_image_url: undefined,
  };

  try {
    result.speakers = extractSpeakers(d.hosts);
  } catch {
    /* leave empty */
  }

  try {
    result.topics = extractTopics(d.categories);
  } catch {
    /* leave empty */
  }

  try {
    // location_type is "offline" for in-person events; virtual events
    // carry their platform's name instead (confirmed "zoom" on a real
    // sample) — treat anything other than "offline" as virtual rather
    // than enumerating every possible platform string.
    result.is_virtual = d.event.location_type !== 'offline';
  } catch {
    /* leave false */
  }

  try {
    result.location_address = d.event.geo_address_info?.address || undefined;
  } catch {
    /* leave undefined */
  }

  try {
    result.cover_image_url = d.event.cover_url || undefined;
  } catch {
    /* leave undefined */
  }

  return result;
}

// Hand-built sanitized snapshot for raw_scrape — the full __NEXT_DATA__
// payload also carries ticketing/payment/guest-list config we have no
// reason to persist, same principle as parse-ics.ts's raw_ical snapshot.
export function buildRawScrapeSnapshot(fields: EnrichedEventFields): Record<string, unknown> {
  return {
    speakers: fields.speakers,
    topics: fields.topics,
    is_virtual: fields.is_virtual,
    location_address: fields.location_address ?? null,
    cover_image_url: fields.cover_image_url ?? null,
    scraped_at: new Date().toISOString(),
  };
}
