// api/check-champion-token.js
// Called by forms/orientation/index.html on page load.
// Validates champion_token against champions.champion_token.
// Returns { valid: true, champion_id, first_name } or { valid: false }
// Champion tokens do not expire — they are persistent identity tokens.

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
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id,first_name`,
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

    const champion = rows[0];
    return res.status(200).json({ valid: true, champion_id: champion.id, first_name: champion.first_name });

  } catch (err) {
    console.error('[check-champion-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
