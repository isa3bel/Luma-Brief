// Drafts a blog-style LinkedIn post about one event, grounded in its real
// details plus the user's own Learnings notes for it. Same architecture as
// summarize-learnings (Claude API call, response envelope, auth pattern) —
// this is the per-event, reflective-tone sibling of that per-month,
// bullet-point one.
import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

const MODEL = 'claude-sonnet-5';

const BASE_SYSTEM_PROMPT = `You write LinkedIn posts for a tech professional who wants to share what they learned at an event they attended, in their own voice.

You'll be given one event's title, date, location, speakers/topics if known, and the person's own raw notes from it. The notes are often quick fragments or half-sentences, not polished writing.

Your job:
- Write in first person, like a real reflective LinkedIn post — not a press release, not a listicle, not corporate-sounding.
- Open with the actual insight or takeaway, not "I attended X event yesterday." Logistics (event name, date, location) belong woven in naturally, not as a headline.
- Turn the raw notes into 1-3 short paragraphs that read smoothly. Do not invent facts, quotes, or opinions the notes don't support.
- If speakers are known and the notes reference something they said or did, it's fine to name them — LinkedIn posts naming real speakers read as more credible, not less.
- Keep it genuinely short: LinkedIn posts get better engagement under ~150 words. Do not pad.
- End on a real thought, not a generic call-to-action like "What are your thoughts?" — only include one if it feels natural.
- At most 2-3 relevant hashtags at the very end, only if they'd feel native to this specific post — never force them.

Return only the post text — no preamble, no headers, no "Here's a draft:", no quotation marks around it.`;

// User-set standing preferences (Settings' "Post instructions" field) win
// over the base defaults above where they conflict — e.g. a requested tone
// or a required intro format should override the generic guidance, not
// just add to it.
function buildSystemPrompt(instructions: string | null): string {
  if (!instructions?.trim()) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}

The user has also given you standing instructions for how they personally want every one of their posts written — tone, structure, anything else. Follow these even where they override the general guidance above:
${instructions.trim()}`;
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
    const eventId: string | undefined = body?.eventId;
    if (!eventId) return json({ error: 'No event specified.' }, 200);

    // RLS scopes this to the caller's own row — same trust model as
    // summarize-learnings re-fetching rather than trusting client text.
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('title, starts_at, location_name, speakers, topics, learnings')
      .eq('id', eventId)
      .maybeSingle();
    if (eventErr) return json({ error: eventErr.message }, 200);
    if (!event) return json({ error: 'Event not found.' }, 200);
    if (!event.learnings?.trim()) {
      return json({ error: 'Add some Learnings notes for this event first.' }, 200);
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('linkedin_post_instructions')
      .eq('user_id', user.id)
      .maybeSingle();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'AI drafting is not configured yet — missing ANTHROPIC_API_KEY.' }, 200);
    }

    const date = new Date(event.starts_at).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const speakerNames = Array.isArray(event.speakers)
      ? event.speakers.map((s: { name?: string }) => s.name).filter(Boolean).join(', ')
      : '';
    const userMessage = [
      `Event: "${event.title}" — ${date}${event.location_name ? ` at ${event.location_name}` : ''}`,
      speakerNames ? `Speakers: ${speakerNames}` : null,
      Array.isArray(event.topics) && event.topics.length > 0 ? `Topics: ${event.topics.join(', ')}` : null,
      `My notes: ${event.learnings}`,
    ]
      .filter(Boolean)
      .join('\n');

    let draft: string;
    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: 'medium' },
        system: buildSystemPrompt(settings?.linkedin_post_instructions ?? null),
        messages: [{ role: 'user', content: userMessage }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      draft = textBlock?.text?.trim() ?? '';
      if (!draft) return json({ error: 'The model returned an empty response.' }, 200);
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

    return json({ draft }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
