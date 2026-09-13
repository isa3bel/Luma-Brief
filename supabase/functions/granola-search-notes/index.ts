// Finds candidate Granola notes for one event, so the client can offer them
// as "import this into Learnings" options. Searches a window around the
// event's own start time (±3 days) rather than an exact-day match — a
// pre-call or a follow-up conversation logged in Granola is still worth
// surfacing here, and the user picks which (if any) actually apply, per
// the multi-note-per-event design.
//
// Same shape as luma-sync/linkedin-connect: runs as the calling user via
// their forwarded JWT (no service role — RLS scopes everything), always
// returns HTTP 200 with errors embedded in the body.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

const WINDOW_DAYS = 3;
const GRANOLA_BASE_URL = 'https://public-api.granola.ai';

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

    const body = await req.json().catch(() => null);
    const eventId: string | undefined = body?.eventId;
    if (!eventId) return json({ error: 'No event specified.' }, 200);

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('starts_at')
      .eq('id', eventId)
      .maybeSingle();
    if (eventErr) return json({ error: eventErr.message }, 200);
    if (!event) return json({ error: 'Event not found.' }, 200);

    const { data: settings, error: settingsErr } = await supabase
      .from('user_settings')
      .select('granola_api_key')
      .eq('user_id', user.id)
      .maybeSingle();
    if (settingsErr) return json({ error: settingsErr.message }, 200);
    if (!settings?.granola_api_key) {
      return json({ error: 'Granola isn’t connected yet — add your API key in Settings first.' }, 200);
    }

    const eventStart = new Date(event.starts_at);
    const windowStart = new Date(eventStart.getTime() - WINDOW_DAYS * 86_400_000);
    const windowEnd = new Date(eventStart.getTime() + WINDOW_DAYS * 86_400_000);

    let notes: { id: string; title: string | null; created_at: string }[];
    try {
      const url = new URL('/v1/notes', GRANOLA_BASE_URL);
      url.searchParams.set('created_after', windowStart.toISOString());
      url.searchParams.set('created_before', windowEnd.toISOString());
      url.searchParams.set('page_size', '30');

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.granola_api_key}` },
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return json({ error: `Granola rejected the request (${resp.status}): ${errBody}` }, 200);
      }
      const data = await resp.json();
      notes = Array.isArray(data?.notes) ? data.notes : [];
    } catch (e) {
      return json({ error: `Couldn't reach Granola: ${String(e)}` }, 200);
    }

    // Mark which of these are already imported for this event, so the
    // client can show "Imported" instead of an Import button for them.
    const { data: imports, error: importsErr } = await supabase
      .from('granola_note_imports')
      .select('granola_note_id')
      .eq('event_id', eventId);
    if (importsErr) return json({ error: importsErr.message }, 200);
    const importedIds = new Set((imports ?? []).map((r) => r.granola_note_id));

    const results = notes
      .map((note) => ({
        id: note.id,
        title: note.title ?? 'Untitled note',
        createdAt: note.created_at,
        alreadyImported: importedIds.has(note.id),
      }))
      // Closest to the event's own start time first.
      .sort(
        (a, b) =>
          Math.abs(new Date(a.createdAt).getTime() - eventStart.getTime()) -
          Math.abs(new Date(b.createdAt).getTime() - eventStart.getTime())
      );

    return json({ notes: results }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
