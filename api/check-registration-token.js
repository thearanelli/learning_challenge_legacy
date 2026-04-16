// api/check-registration-token.js
// Called by forms/champion-register/index.html on page load.
// Validates registration_token against champions.registration_token.
// Returns { valid: true, first_name, phone, bio } or { valid: false }

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
      `${supabaseUrl}/rest/v1/champions?registration_token=eq.${encodeURIComponent(token)}&select=id,first_name,phone,bio`,
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
    return res.status(200).json({
      valid:      true,
      first_name: champion.first_name,
      phone:      champion.phone ?? '',
      bio:        champion.bio   ?? '',
    });

  } catch (err) {
    console.error('[check-registration-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
