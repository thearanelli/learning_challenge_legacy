// api/video-submit.js
// Receives { token, video_url }, stores video_url on the application row.
// oEmbed validation is handled by the validate-video Edge Function via DB webhook.
// One submission chance only — invalid video results in immediate rejection.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(application, token) {
  if (!application.access_token || application.access_token !== token) return false;
  if (!application.stage_deadline_at) return false;
  return new Date(application.stage_deadline_at).getTime() + 86400000 > Date.now();
}

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

  const { token, video_url } = req.body;
  if (!token || !video_url) {
    return res.status(400).json({ error: 'Missing token or video_url' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const githubToken = process.env.GITHUB_WORKFLOW_TOKEN;
  if (!supabaseUrl || !supabaseKey || !githubToken) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Look up application by access_token
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,screening_status,access_token,stage_deadline_at`,
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
  if (!rows.length) {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }
  const application = rows[0];
  const validStatuses = ['video_pending'];
  if (!validStatuses.includes(application.screening_status)) {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }
  if (!isTokenValid(application, token)) {
    return res.status(200).json({ success: false, error: 'expired_token' });
  }

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
      body: JSON.stringify({ video_url, access_token: null, stage_deadline_at: null }),
    }
  );

  if (!patchRes.ok) {
    return res.status(500).json({ error: 'Failed to save video URL' });
  }

  // Trigger GitHub Actions workflow to download and re-upload to GripTape YouTube
  const repoOwner = 'thearanelli';
  const repoName = 'learning_challenge_legacy';

  // Look up youth_id for this application
  const youthRes = await fetch(
    `${supabaseUrl}/rest/v1/youth?application_id=eq.${application.id}&select=id,first_name,last_name`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );
  const youthRows = await youthRes.json();
  const youth = youthRows[0];
  const videoTitle = youth
    ? `GripTape First Drop — ${youth.first_name} ${youth.last_name}`
    : 'GripTape First Drop';

  await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/upload-video.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          youtube_url: video_url,
          youth_id: youth?.id ?? '',
          application_id: application.id,
          title: videoTitle,
        }
      })
    }
  );

  return res.status(200).json({ success: true, application_id: application.id });
}
