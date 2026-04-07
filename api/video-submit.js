// api/video-submit.js
// Receives { token, video_url }, stores video_url on the application row.
// Validation (oEmbed) is handled by the validate-video Edge Function via DB webhook.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, video_url } = req.body;
  if (!token || !video_url) {
    return res.status(400).json({ error: 'Missing token or video_url' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Look up application by access_token
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,screening_status`,
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
  if (!rows.length || rows[0].screening_status !== 'video_pending') {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }

  const application = rows[0];

  // Store video_url — webhook fires validate-video Edge Function
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/applications?id=eq.${application.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ video_url }),
    }
  );

  if (!patchRes.ok) {
    return res.status(500).json({ error: 'Failed to save video URL' });
  }

  return res.status(200).json({ success: true });
}
