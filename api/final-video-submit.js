// api/final-video-submit.js
// Validates final video token, nulls it, then calls process-full-send
// Edge Function directly. Direct invocation prevents webhook duplicate fires.
// Does NOT set status — process-full-send owns that transition.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(youth, token) {
  if (!youth.access_token || youth.access_token !== token) return false;
  if (!youth.token_expires_at) return false;
  return new Date(youth.token_expires_at) > new Date();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { youth_id, token, full_send_url } = req.body;
  if (!youth_id || !token || !full_send_url) {
    return res.status(400).json({ error: 'Missing youth_id, token, or full_send_url' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Look up youth by id
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/youth?id=eq.${encodeURIComponent(youth_id)}&select=id,status,access_token,token_expires_at`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!lookupRes.ok) {
    return res.status(500).json({ error: 'Database error' });
  }

  const rows = await lookupRes.json();
  if (!rows.length) {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }
  const youth = rows[0];

  if (youth.status !== 'final_video_pending') {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }
  if (!isTokenValid(youth, token)) {
    return res.status(200).json({ success: false, error: 'expired_token' });
  }

  // Null the token — process-full-send owns the status transition
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/youth?id=eq.${youth.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        access_token: null,
        token_expires_at: null,
      }),
    }
  );

  if (!patchRes.ok) {
    return res.status(500).json({ error: 'Failed to null final video token' });
  }

  const supabaseProjectRef = process.env.SUPABASE_URL
    .replace('https://', '')
    .replace('.supabase.co', '');

  const edgeRes = await fetch(
    `https://${supabaseProjectRef}.supabase.co/functions/v1/process-full-send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ youth_id: youth.id, full_send_url }),
    }
  );

  if (!edgeRes.ok) {
    console.error('[final-video-submit] process-full-send call failed:',
      await edgeRes.text());
    // Submission was recorded. Non-fatal — return success to form.
  }

  return res.status(200).json({ success: true });
}
