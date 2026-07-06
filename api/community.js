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

  const query = `select=id,first_name,last_name,city,state,passion,first_drop_url,application_id,champion_id,champions(first_name),applications(profile_token)&orientation_call_completed_at=not.is.null&order=orientation_call_completed_at.asc`;

  const response = await fetch(`${supabaseUrl}/rest/v1/youth?${query}`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error ${response.status}: ${errorText}`);
  }

  const rows = await response.json();

  return rows.map(row => ({
    id: row.id,
    first_name: row.first_name,
    last_initial: row.last_name ? row.last_name[0].toUpperCase() : '',
    city: row.city || '',
    state: row.state || '',
    passion: row.passion || '',
    first_drop_url: row.first_drop_url || null,
    champion_first_name: row.champions?.first_name || null,
    profile_token: row.applications?.profile_token || null,
  }));
}
