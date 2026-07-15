// api/video-upload-url.js
// Returns a signed upload URL for Supabase Storage (videos bucket).
// Validates token against applications table — must be video_pending.

function isTokenValid(application, token) {
  if (!application.access_token || application.access_token !== token) return false;
  if (!application.stage_deadline_at) return false;
  return new Date(application.stage_deadline_at).getTime() + 86400000 > Date.now();
}

export default async function handler(req, res) {
  try {
    console.log('[video-upload-url] env check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasGithubToken: !!process.env.GITHUB_WORKFLOW_TOKEN,
      method: req.method,
      body: req.body,
    });

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

    const { token } = req.body;
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

    // Look up application by access_token
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,screening_status,access_token,stage_deadline_at`,
      { headers }
    );

    if (!lookupRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const rows = await lookupRes.json();
    if (!rows.length) {
      return res.status(200).json({ success: false, error: 'invalid_token' });
    }

    const application = rows[0];
    if (application.screening_status !== 'video_pending') {
      return res.status(200).json({ success: false, error: 'invalid_token' });
    }
    if (!isTokenValid(application, token)) {
      return res.status(200).json({ success: false, error: 'expired_token' });
    }

    const path = `first-drop-${application.id}`;

    // Generate signed upload URL
    const signRes = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/first_drops/${path}`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600, upsertEnabled: true }),
      }
    );

    if (!signRes.ok) {
      const errText = await signRes.text();
      console.error('[video-upload-url] sign error:', errText);
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }

    const signData = await signRes.json();
    const signed_url = `${supabaseUrl}/storage/v1${signData.url}`;

    console.log('[video-upload-url] signed_url:', signed_url);

    return res.status(200).json({ success: true, signed_url, path });

  } catch (err) {
    console.error('[video-upload-url] FATAL:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
