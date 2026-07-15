// api/champion-youth-list.js
// Returns youth assigned to the authenticated champion.
// Called by forms/orientation/index.html and champion/index.html.
// Excludes removed and completed youth — terminal statuses.
// Includes status, deadlines, passion, first_drop_url, and checkins.

const STAGE_PRIORITY = {
  mentor_pending: 1,
  grant_pending: 2,
  grant_approved: 3,
  grant_expired: 4,
  final_video_pending: 5,
  full_send_review: 6,
};

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://thelearningchallenge.org', 'https://learning-challenge-legacy.vercel.app'];
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
      return res.status(200).json({ valid: false });
    }

    const champion_id = champRows[0].id;

    // Load active youth for this champion — excluding terminal statuses
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?champion_id=eq.${champion_id}&status=not.in.(removed,completed)&select=id,first_name,last_name,status,stage_entered_at,accepted_at,first_drop_url`,
      { headers }
    );

    if (!youthRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const youth = await youthRes.json();

    // Fetch checkins for this champion's youth
    const checkinsRes = await fetch(
      `${supabaseUrl}/rest/v1/champion_checkins?champion_id=eq.${champion_id}&order=call_date.asc&select=id,youth_id,type,call_date,note,created_at`,
      { headers }
    );

    let checkinsByYouth = {};
    if (checkinsRes.ok) {
      const allCheckins = await checkinsRes.json();
      for (const c of allCheckins) {
        if (!checkinsByYouth[c.youth_id]) checkinsByYouth[c.youth_id] = [];
        checkinsByYouth[c.youth_id].push(c);
      }
    }

    // Fetch passion from applications for each youth
    let passionByYouth = {};
    if (youth.length > 0) {
      const youthIds = youth.map(y => y.id).join(',');
      const appsRes = await fetch(
        `${supabaseUrl}/rest/v1/applications?select=youth_id,application_responses&youth_id=in.(${youthIds})`,
        { headers }
      );

      if (appsRes.ok) {
        const apps = await appsRes.json();
        for (const app of apps) {
          try {
            const responses = typeof app.application_responses === 'string'
              ? JSON.parse(app.application_responses)
              : app.application_responses;
            if (responses && responses.passion) {
              passionByYouth[app.youth_id] = responses.passion;
            }
          } catch (_) {
            // skip parse errors
          }
        }
      }
    }

    // Attach checkins and passion to each youth, then sort
    const enriched = youth.map(y => ({
      ...y,
      passion: passionByYouth[y.id] || null,
      checkins: checkinsByYouth[y.id] || [],
    }));

    enriched.sort((a, b) => {
      const pa = STAGE_PRIORITY[a.status] ?? 99;
      const pb = STAGE_PRIORITY[b.status] ?? 99;
      return pa - pb;
    });

    return res.status(200).json({ valid: true, youth: enriched });

  } catch (err) {
    console.error('[champion-youth-list] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
