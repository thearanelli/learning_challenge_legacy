export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://thelearningchallenge.org', 'https://learning-challenge-legacy.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { application_id, page } = req.body;
  if (!application_id || !page) return res.status(400).json({ error: 'Missing fields' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    const entry = {
      page,
      completed: true,
      ts: new Date().toISOString(),
    };

    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/analytics_events?application_id=eq.${application_id}&select=id,activity`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const rows = await checkRes.json();

    if (rows.length > 0) {
      await fetch(
        `${supabaseUrl}/rest/v1/analytics_events?application_id=eq.${application_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            activity: [...(rows[0].activity || []), entry],
            updated_at: new Date().toISOString(),
          }),
        }
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[log-completion] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
