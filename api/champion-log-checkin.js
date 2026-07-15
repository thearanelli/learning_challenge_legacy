// api/champion-log-checkin.js
// POST handler — logs a check-in or orientation_scheduled event for a champion's youth.
// Validates champion token, inserts into champion_checkins.

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://thelearningchallenge.org', 'https://learning-challenge-legacy.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, youth_id, type, call_date, note, youth_name, champion_name } = req.body;
  if (!token || !youth_id || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    // Validate champion token
    const champRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id`,
      { headers }
    );

    if (!champRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const champRows = await champRes.json();
    if (!champRows.length) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const champion_id = champRows[0].id;

    // Insert checkin
    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/champion_checkins`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          youth_id,
          champion_id,
          youth_name: youth_name || null,
          champion_name: champion_name || null,
          type,
          call_date: call_date || null,
          note: note || null,
        }),
      }
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[champion-log-checkin] insert error:', errText);
      return res.status(500).json({ error: 'Failed to log check-in' });
    }

    const rows = await insertRes.json();
    return res.status(200).json({ success: true, id: rows[0].id });

  } catch (err) {
    console.error('[champion-log-checkin] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
