// Publishes the (possibly user-edited) draft to the caller's own LinkedIn
// profile via LinkedIn's Posts API — see
// https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
// for the exact request shape this mirrors. Requires a prior
// linkedin-connect (Settings' "Connect LinkedIn").
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

// LinkedIn requires a concrete YYYYMM version on every Posts API call —
// current as of the API docs consulted when this was written; bump if
// LinkedIn deprecates it (they give ~12 months' notice per version).
const LINKEDIN_API_VERSION = '202608';

// The Posts API's "commentary" field isn't plain text — it's LinkedIn's own
// "little" rich-text format (mentions, hashtags, bold/italic). That format
// reserves \ | { } @ [ ] ( ) < > * _ ~ , and ANY occurrence of one of these
// — even outside an actual mention or hashtag — has to be backslash-escaped
// or LinkedIn's parser breaks and silently drops everything from that
// point on. Confirmed against a real published post that cut off exactly
// at the first unescaped "(" in an ordinary parenthetical remark.
// # is deliberately left unescaped: unlike the others it's genuinely
// useful unescaped, since a bare #word (exactly what this app's own
// drafts end with) is how LinkedIn renders a real, clickable hashtag —
// escaping it would turn every intentional hashtag into inert text.
function escapeLittleText(text: string): string {
  return text.replace(/[\\|{}@\[\]()<>*_~]/g, (char) => `\\${char}`);
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
    const text: string | undefined = body?.text?.trim();
    if (!eventId || !text) return json({ error: 'Missing eventId or text.' }, 200);

    const { data: connection, error: connErr } = await supabase
      .from('linkedin_connections')
      .select('access_token, expires_at, member_urn')
      .eq('user_id', user.id)
      .maybeSingle();
    if (connErr) return json({ error: connErr.message }, 200);
    if (!connection) {
      return json({ error: 'LinkedIn isn’t connected yet — connect it in Settings first.' }, 200);
    }
    if (new Date(connection.expires_at) < new Date()) {
      return json({ error: 'Your LinkedIn connection expired — reconnect in Settings.' }, 200);
    }

    let postUrn: string | null = null;
    try {
      const resp = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'Linkedin-Version': LINKEDIN_API_VERSION,
        },
        body: JSON.stringify({
          author: connection.member_urn,
          commentary: escapeLittleText(text),
          visibility: 'PUBLIC',
          distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      });
      if (resp.status !== 201) {
        const errBody = await resp.text();
        return json({ error: `LinkedIn rejected the post (${resp.status}): ${errBody}` }, 200);
      }
      // Success carries the new post's URN in this response header, not the body.
      postUrn = resp.headers.get('x-restli-id');
    } catch (e) {
      return json({ error: `Couldn't reach LinkedIn's Posts API: ${String(e)}` }, 200);
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('events')
      .update({ linkedin_post_urn: postUrn, linkedin_posted_at: nowIso })
      .eq('id', eventId);
    if (updateErr) return json({ error: updateErr.message }, 200);

    return json(
      {
        posted: true,
        postUrn,
        postUrl: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}/` : null,
        postedAt: nowIso,
      },
      200
    );
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
