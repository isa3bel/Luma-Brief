// Completes the LinkedIn OAuth 2.0 flow: exchanges the authorization code
// the client got back from LinkedIn for an access token, resolves the
// member's own profile URN, and stores both. The client never sees
// LINKEDIN_CLIENT_SECRET — that's the whole reason this step is a server
// function instead of happening directly in the app.
//
// Same shape as luma-sync/summarize-learnings: runs as the calling user via
// their forwarded JWT (no service role — RLS scopes everything), always
// returns HTTP 200 with errors embedded in the body.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';

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
    const code: string | undefined = body?.code;
    const redirectUri: string | undefined = body?.redirectUri;
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri.' }, 200);
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return json({ error: 'LinkedIn is not configured yet — missing LINKEDIN_CLIENT_ID/SECRET.' }, 200);
    }

    // Step 1: exchange the authorization code for an access token.
    let tokenJson: { access_token?: string; expires_in?: number; error_description?: string };
    try {
      const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      tokenJson = await tokenResp.json();
      if (!tokenResp.ok || !tokenJson.access_token) {
        return json({ error: `LinkedIn rejected the code: ${tokenJson.error_description ?? tokenResp.status}` }, 200);
      }
    } catch (e) {
      return json({ error: `Couldn't reach LinkedIn's token endpoint: ${String(e)}` }, 200);
    }

    const accessToken = tokenJson.access_token;
    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 60 * 24 * 60 * 60) * 1000).toISOString();

    // Step 2: resolve the member's own id (the OpenID `sub` claim) to build
    // the exact author URN the Posts API expects — see
    // https://api.linkedin.com/v2/userinfo (Sign In with LinkedIn using
    // OpenID Connect's own profile endpoint, needs the `profile` scope).
    let memberUrn: string;
    let memberName: string | undefined;
    try {
      const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileResp.json();
      if (!profileResp.ok || !profile.sub) {
        return json({ error: `Couldn't resolve your LinkedIn profile: ${profileResp.status}` }, 200);
      }
      memberUrn = `urn:li:person:${profile.sub}`;
      memberName = profile.name;
    } catch (e) {
      return json({ error: `Couldn't reach LinkedIn's profile endpoint: ${String(e)}` }, 200);
    }

    const { error: upsertErr } = await supabase.from('linkedin_connections').upsert(
      {
        user_id: user.id,
        access_token: accessToken,
        expires_at: expiresAt,
        member_urn: memberUrn,
        member_name: memberName ?? null,
      },
      { onConflict: 'user_id' }
    );
    if (upsertErr) return json({ error: upsertErr.message }, 200);

    return json({ connected: true, memberName: memberName ?? null, expiresAt }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${String(e)}` }, 200);
  }
});
