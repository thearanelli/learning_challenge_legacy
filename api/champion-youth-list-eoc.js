// api/champion-youth-list-eoc.js
// Returns youth assigned to the authenticated champion who are eligible for EOC.
// Called by forms/end-of-challenge/index.html on page load to populate the youth dropdown.
// Filters to EOC-eligible statuses only: grant_approved, grant_expired, final_video_pending.

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://learning-challenge-legacy.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
    // Validate champion token
    const champRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!champRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const champRows = await champRes.json();
    if (!champRows.length) {
      return res.status(200).json({ valid: false });
    }

    const champion_id = champRows[0].id;

    // Load EOC-eligible youth for this champion
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?champion_id=eq.${champion_id}&status=in.(grant_approved,grant_expired,final_video_pending)&select=id,first_name,last_name,passion`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!youthRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const youth = await youthRes.json();
    return res.status(200).json({ valid: true, youth });

  } catch (err) {
    console.error('[champion-youth-list-eoc] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
