// api/check-token.js
// Gates the video submission form (forms/video/index.html).
// Called on page load to verify the magic link token before showing the form.
// Accepts video_pending only. One video submission chance — no resubmit window.
// Validates token match AND deadline expiry via isTokenValid.
// Future stage forms (meeting, grant) should have their own check-token files
// following this same pattern — do not make this file generic.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(application, token) {
  if (!application.access_token || application.access_token !== token) return false;
  if (!application.stage_deadline_at) return false;
  return new Date(application.stage_deadline_at) > new Date();
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
      `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,screening_status,access_token,stage_deadline_at`,
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

    const application = rows[0];
    const validStatuses = ['video_pending'];

    if (!validStatuses.includes(application.screening_status)) {
      return res.status(200).json({ valid: false });
    }

    if (!isTokenValid(application, token)) {
      return res.status(200).json({ valid: false, expired: true });
    }

    return res.status(200).json({ valid: true, first_name: application.first_name });

  } catch (err) {
    console.error('[check-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
