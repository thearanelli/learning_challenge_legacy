// api/profile.js
// Returns read-only public profile data for a builder, gated by profile_token.
// Called on load by profile/index.html.
// GET only — no writes, no sensitive fields returned.

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
      `${supabaseUrl}/rest/v1/applications?profile_token=eq.${encodeURIComponent(token)}&select=first_name,screening_status,submitted_at,application_responses`,
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
      return res.status(200).json({ found: false });
    }

    const { first_name, screening_status, submitted_at, application_responses } = rows[0];

    return res.status(200).json({
      found: true,
      data: { first_name, screening_status, submitted_at, application_responses },
    });

  } catch (err) {
    console.error('[profile] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
