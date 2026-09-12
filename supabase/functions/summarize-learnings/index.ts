// Generates the Learnings tab's monthly "Key Takeaways" — elaborates and
// connects a user's scattered per-event notes into a small set of concise,
// speakable takeaways (see the system prompt below for the actual brief).
// Same shape as luma-sync: runs as the calling user via their forwarded
// JWT (no service role — RLS scopes everything), always returns HTTP 200
// with errors embedded in the body so supabase-js's functions.invoke()
// always hands the client a normal object to render.
import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT = `You help a tech professional turn scattered, shorthand notes from networking events into a small set of clear, concise takeaways they can recall and speak about naturally — including in a job interview.

You'll be given several events from one month, each with its title, date, and the person's raw notes. These notes are often quick bullet fragments, abbreviations, or half-sentences — not polished writing.

Your job:
- Read across ALL the notes for the month together, not event by event. Look for connections, recurring themes, or contradictions between different events.
- Group the takeaways into 2-4 short thematic sections based on what the notes actually cluster around this month (e.g. "Agentic AI", "Career & Networking") — don't force a fixed set of categories, and don't create a section for just one unrelated point.
- Turn fragments into complete, natural statements within each section. Elaborate just enough for each point to stand on its own and read smoothly. Do not invent facts, people, companies, or opinions that aren't implied by the notes.
- Prioritize substance over logistics — focus on what was actually learned or concluded (industry trends, technical insights, opinions formed, notable people and why they matter), not that an event merely happened.
- Keep each section to 1-3 short bullet points (1-2 sentences each), phrased the way someone would say them out loud if asked "what have you been learning lately?" Keep the whole thing to 3-6 bullet points total across all sections combined.
- If the notes are too sparse to say something substantive, produce fewer/shorter sections rather than padding.

Format: each section is a markdown header line starting with "## " followed by a short (1-4 word) theme name, then that section's bullet points on their own lines starting with "- ". Return only the sections — no preamble, no closing remarks.`;

type EventForSummary = { id: string; title: string; starts_at: string; learnings: string };

function buildUserMessage(events: EventForSummary[]): string {
  return events
    .map((e) => {
      const date = new Date(e.starts_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `Event: "${e.title}" — ${date}\nNotes: ${e.learnings}`;
    })
    .join('\n\n');
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

    const body = await req.json().catch(() => null);
    const month: string | undefined = body?.month;
    const eventIds: string[] | undefined = body?.eventIds;
    if (!month || !Array.isArray(eventIds) || eventIds.length === 0) {
      return json({ error: 'No events selected to summarize.' }, 200);
    }

    // Re-fetches from the DB rather than trusting client-supplied note text
    // directly — RLS already scopes this to the caller's own rows, this is
    // just about using authoritative content, not a security boundary.
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('id, title, starts_at, learnings')
      .in('id', eventIds);
    if (eventsErr) return json({ error: eventsErr.message }, 200);

    const withNotes = (events ?? []).filter((e): e is EventForSummary => Boolean(e.learnings?.trim()));
    if (withNotes.length === 0) {
      return json({ error: 'No notes found for the selected events.' }, 200);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'AI summaries are not configured yet — missing ANTHROPIC_API_KEY.' }, 200);
    }

    let summaryText: string;
    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: 'medium' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(withNotes) }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      summaryText = textBlock?.text?.trim() ?? '';
      if (!summaryText) return json({ error: 'The model returned an empty response.' }, 200);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        return json({ error: 'Anthropic API key was rejected — check ANTHROPIC_API_KEY.' }, 200);
      }
      if (e instanceof Anthropic.RateLimitError) {
        return json({ error: 'Rate limited by Anthropic — try again in a moment.' }, 200);
      }
      if (e instanceof Anthropic.APIError) {
        return json({ error: `Anthropic API error (${e.status}): ${e.message}` }, 200);
      }
      return json({ error: `Unexpected error calling the AI model: ${String(e)}` }, 200);
    }

    const nowIso = new Date().toISOString();
    const usedEventIds = withNotes.map((e) => e.id);

    const { error: upsertErr } = await supabase.from('monthly_summaries').upsert(
      {
        user_id: user.id,
        month,
        summary: summaryText,
        source_event_ids: usedEventIds,
        model: MODEL,
        generated_at: nowIso,
      },
      { onConflict: 'user_id,month' }
    );
    if (upsertErr) return json({ error: upsertErr.message }, 200);

    return json(
      { month, summary: summaryText, sourceEventIds: usedEventIds, model: MODEL, generatedAt: nowIso },
      200
    );
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
