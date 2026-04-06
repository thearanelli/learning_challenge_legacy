// api/check-token.js
// Validates a video submission access token.
// Called by forms/video/index.html before showing the submission form.

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
      `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,screening_status`,
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

    if (!rows.length || rows[0].screening_status !== 'video_pending') {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({ valid: true, first_name: rows[0].first_name });
  } catch (err) {
    console.error('[check-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
