// Fetches one Granola note's AI summary and appends it into the event's
// Learnings — never replaces, per the multi-note-per-event design (a
// pre-call and the event itself might both get imported over time, each
// adding to the same notes rather than clobbering what's there).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

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
    const granolaNoteId: string | undefined = body?.granolaNoteId;
    if (!eventId || !granolaNoteId) return json({ error: 'Missing eventId or granolaNoteId.' }, 200);

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, learnings')
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

    let title: string;
    let createdAt: string;
    let summary: string;
    try {
      const resp = await fetch(new URL(`/v1/notes/${granolaNoteId}`, GRANOLA_BASE_URL), {
        headers: { Authorization: `Bearer ${settings.granola_api_key}` },
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return json({ error: `Granola rejected the request (${resp.status}): ${errBody}` }, 200);
      }
      const note = await resp.json();
      title = note?.title ?? 'Untitled note';
      createdAt = note?.created_at ?? new Date().toISOString();
      // The exact field name for the AI summary isn't pinned down against
      // a real response yet (no live API key available while building
      // this) — Granola's own docs describe it only as "Summary
      // (AI-generated overview)" without quoting the literal JSON key.
      // Checking a few plausible names defensively rather than guessing
      // one; if none match, the error below says so explicitly instead of
      // silently importing nothing.
      summary = note?.summary ?? note?.ai_summary ?? note?.notes_markdown ?? note?.notes ?? '';
      if (!summary.trim()) {
        return json(
          {
            error:
              'Granola returned this note but no summary text was found under any expected field — the API response shape may not match what this was built against yet.',
          },
          200
        );
      }
    } catch (e) {
      return json({ error: `Couldn't reach Granola: ${String(e)}` }, 200);
    }

    const dateLabel = new Date(createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const block = `\n\n— From Granola: "${title}" (${dateLabel}) —\n${summary.trim()}`;
    const nextLearnings = `${event.learnings ?? ''}${block}`.trim();

    const { error: updateErr } = await supabase
      .from('events')
      .update({ learnings: nextLearnings })
      .eq('id', eventId);
    if (updateErr) return json({ error: updateErr.message }, 200);

    const { error: importErr } = await supabase.from('granola_note_imports').insert({
      user_id: user.id,
      event_id: eventId,
      granola_note_id: granolaNoteId,
      granola_note_title: title,
      granola_note_created_at: createdAt,
    });
    // A duplicate (already imported) is a real constraint conflict, not
    // treated as an error — Learnings was already updated above in that
    // case only if this is genuinely a first import; the unique
    // constraint prevents a second one from getting this far in the UI
    // anyway (see granola-search-notes' alreadyImported flag).
    if (importErr && importErr.code !== '23505') return json({ error: importErr.message }, 200);

    return json({ imported: true, learnings: nextLearnings }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
