// api/check-youth-token.js
// Gates the grant form (forms/grant/index.html).
// Called on page load to verify the magic link token before showing the form.
// Accepts grant_pending only.
// Validates token match AND deadline expiry.
// Do not make this file generic — future stage forms should have their own.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(youth, token) {
  if (!youth.access_token || youth.access_token !== token) return false;
  if (!youth.stage_deadline_at) return false;
  return new Date(youth.stage_deadline_at) > new Date();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/youth?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,status,access_token,stage_deadline_at`,
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

    if (youth.status !== 'grant_pending') {
      return res.status(200).json({ valid: false });
    }

    if (!isTokenValid(youth, token)) {
      return res.status(200).json({ valid: false, expired: true });
    }

    return res.status(200).json({ valid: true, first_name: youth.first_name });

  } catch (err) {
    console.error('[check-youth-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
