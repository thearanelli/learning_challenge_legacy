// api/cohort.js
// Public Vercel serverless function — returns completed 2026 challengers for the cohort showcase.
// "Completed" = youth who have submitted their full-send video (full_send_url is set)
// OR who have completed the end-of-challenge form.

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = [
    'http://localhost:8080',
    'https://thelearningchallenge.org',
    'https://learning-challenge-legacy.vercel.app',
  ];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await fetchCohort();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Cohort fetch error:', err);
    return res.status(500).json({ error: 'Failed to load cohort data' });
  }
}

async function fetchCohort() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  // Fetch youth who have completed the challenge (end-of-challenge form submitted)
  // Falls back to showing anyone with a full_send_url if end_of_challenge_completed_at isn't set.
  const youthQuery = [
    'select=id,first_name,last_name,city,state,passion,first_drop_url,full_send_url,champion_id,end_of_challenge_completed_at,accepted_at',
    'end_of_challenge_completed_at=not.is.null',
    'order=end_of_challenge_completed_at.asc',
  ].join('&');

  const youthRes = await fetch(`${supabaseUrl}/rest/v1/youth?${youthQuery}`, { headers });
  if (!youthRes.ok) {
    const errorText = await youthRes.text();
    throw new Error(`Supabase youth error ${youthRes.status}: ${errorText}`);
  }
  const youth = await youthRes.json();

  // Champion name lookup (no FK constraint on youth.champion_id)
  const championIds = [...new Set(youth.map(y => y.champion_id).filter(Boolean))];
  const championMap = {};

  if (championIds.length > 0) {
    const champQuery = `select=id,first_name,last_name&id=in.(${championIds.join(',')})`;
    const champRes = await fetch(`${supabaseUrl}/rest/v1/champions?${champQuery}`, { headers });
    if (champRes.ok) {
      const champions = await champRes.json();
      for (const c of champions) {
        championMap[c.id] = c.first_name;
      }
    }
  }

  return youth.map(row => ({
    first_name: row.first_name,
    last_initial: row.last_name ? row.last_name[0].toUpperCase() : '',
    city: row.city || '',
    state: row.state || '',
    passion: row.passion || '',
    // Prefer the final "full send" video; fall back to intro video
    video_url: row.full_send_url || row.first_drop_url || null,
    first_drop_url: row.first_drop_url || null,
    champion_first_name: championMap[row.champion_id] || null,
    completed_at: row.end_of_challenge_completed_at || null,
  }));
}
