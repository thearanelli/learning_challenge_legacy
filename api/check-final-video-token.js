// api/check-final-video-token.js
// Gates the final video form (forms/final-video/index.html).
// Called on page load to verify the magic link token before showing the form.
// Accepts final_video_pending only.
// Validates token match AND deadline expiry.
// Do not make this file generic — future stage forms should have their own.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(youth, token) {
  if (!youth.access_token || youth.access_token !== token) return false;
  if (!youth.token_expires_at) return false;
  return new Date(youth.token_expires_at) > new Date();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, youth_id } = req.query;
  if (!token || !youth_id) {
    return res.status(400).json({ error: 'Missing token or youth_id' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/youth?id=eq.${encodeURIComponent(youth_id)}&select=id,first_name,status,access_token,token_expires_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ valid: false });
    }

    const youth = rows[0];

    if (youth.status !== 'final_video_pending') {
      return res.status(200).json({ valid: false });
    }

    if (!isTokenValid(youth, token)) {
      return res.status(200).json({ valid: false, expired: true });
    }

    return res.status(200).json({ valid: true, first_name: youth.first_name });

  } catch (err) {
    console.error('[check-final-video-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
