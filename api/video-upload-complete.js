// api/video-upload-complete.js
// Called after file upload to Supabase Storage completes.
// Validates token, confirms file exists, triggers GitHub Actions workflow,
// and nulls out access_token/stage_deadline_at.

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

  const { token, path } = req.body;
  if (!token || !path) {
    return res.status(400).json({ error: 'Missing token or path' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const githubToken = process.env.GITHUB_WORKFLOW_TOKEN;
  console.log('[video-upload-complete] GitHub token preview:', githubToken ? `${githubToken.slice(0,4)}...${githubToken.slice(-4)} (len:${githubToken.length})` : 'MISSING');
  if (!supabaseUrl || !supabaseKey || !githubToken) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
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

    // Confirm file exists in Supabase Storage
    const headRes = await fetch(
      `${supabaseUrl}/storage/v1/object/info/first_drops/${path}`,
      { headers }
    );

    if (!headRes.ok) {
      return res.status(200).json({ success: false, error: 'file_not_found' });
    }

    // Look up youth_id for this application
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?application_id=eq.${application.id}&select=id,first_name,last_name`,
      { headers }
    );
    const youthRows = await youthRes.json();
    const youth = youthRows[0];
    const videoTitle = youth
      ? `GripTape First Drop — ${youth.first_name} ${youth.last_name}`
      : 'GripTape First Drop';

    // Trigger GitHub Actions workflow
    const repoOwner = 'thearanelli';
    const repoName = 'learning_challenge_legacy';

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
            supabase_storage_path: path,
            youth_id: youth?.id ?? '',
            application_id: application.id,
            title: videoTitle,
          }
        })
      }
    );

    // Only null out token after GitHub trigger succeeds
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/applications?id=eq.${application.id}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: `storage:first_drops/${path}`,
          access_token: null,
          stage_deadline_at: null,
        }),
      }
    );

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Failed to update application' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[video-upload-complete] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
