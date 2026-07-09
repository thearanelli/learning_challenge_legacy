// api/community.js
// Public Vercel serverless function — reads community data from Supabase.

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
    const data = await fetchCommunity();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Community fetch error:', err);
    return res.status(500).json({ error: 'Failed to load community data' });
  }
}

async function fetchCommunity() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  // Query 1: youth joined to applications (no FK to champions)
  const youthQuery = `select=id,first_name,last_name,city,state,passion,first_drop_url,champion_id,applications!inner(profile_token)&orientation_call_completed_at=not.is.null&order=orientation_call_completed_at.asc`;
  const youthRes = await fetch(`${supabaseUrl}/rest/v1/youth?${youthQuery}`, { headers });
  if (!youthRes.ok) {
    const errorText = await youthRes.text();
    throw new Error(`Supabase youth error ${youthRes.status}: ${errorText}`);
  }
  const youth = await youthRes.json();

  // Query 2: champions lookup (separate — no FK constraint on youth.champion_id)
  const championIds = [...new Set(youth.map(y => y.champion_id).filter(Boolean))];
  const championMap = {};

  if (championIds.length > 0) {
    const champQuery = `select=id,first_name&id=in.(${championIds.join(',')})`;
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
    last_name: row.last_name || '',
    last_initial: row.last_name ? row.last_name[0].toUpperCase() : '',
    city: row.city || '',
    state: row.state || '',
    passion: row.passion || '',
    first_drop_url: row.first_drop_url || null,
    champion_first_name: championMap[row.champion_id] || null,
    profile_token: Array.isArray(row.applications) ? (row.applications[0]?.profile_token || null) : (row.applications?.profile_token || null),
  }));
}
