const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://thelearningchallenge.org', 'https://learning-challenge-legacy.vercel.app'];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, method = 'POST', body, service } = req.body;

  if (!url) return res.status(400).json({ error: 'url required' });

  const authHeader = service === 'resend'
    ? `Bearer ${process.env.RESEND_API_KEY}`
    : `Bearer ${process.env.SUPABASE_SERVICE_KEY}`;

  try {
    const r = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    try { res.status(r.status).json(JSON.parse(text)); }
    catch { res.status(r.status).send(text); }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
