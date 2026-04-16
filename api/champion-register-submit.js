// api/champion-register-submit.js
// Receives { token, phone, bio }, updates the champion record.
// Generates and stores champion_token on every registration (or re-registration).
// champion_token is used to authenticate the champion on forms/orientation/.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, phone, bio } = req.body;
  if (!token || !phone || !bio) {
    return res.status(400).json({ error: 'Missing token, phone, or bio' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Validate registration token
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?registration_token=eq.${encodeURIComponent(token)}&select=id`,
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
      return res.status(400).json({ error: 'Invalid token' });
    }

    const champion_id = rows[0].id;

    // Update champion record — generate champion_token for orientation form access
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?id=eq.${champion_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          phone:            phone,
          bio:              bio,
          champion_token:   crypto.randomUUID(),
          registered_at:    new Date().toISOString(),
        }),
      }
    );

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Failed to save registration' });
    }

    console.log(`[champion-register-submit] champion ${champion_id} registered`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[champion-register-submit] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
