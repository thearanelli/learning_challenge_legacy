// api/declare-submit.js
// Validates declaration token, nulls it, then calls process-declaration
// Edge Function directly. Direct invocation prevents webhook duplicate fires.
// Does NOT set screening_status — process-declaration owns that transition.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(application, token) {
  if (!application.access_token || application.access_token !== token) return false;
  if (!application.stage_deadline_at) return false;
  return new Date(application.stage_deadline_at) > new Date();
}

export default async function handler(req, res) {
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
  const validStatuses = ['declaration_pending'];
  if (!validStatuses.includes(application.screening_status)) {
    return res.status(200).json({ success: false, error: 'invalid_token' });
  }
  if (!isTokenValid(application, token)) {
    return res.status(200).json({ success: false, error: 'expired_token' });
  }

  // Null the token — process-declaration owns the status transition
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/applications?id=eq.${application.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        access_token: null,
        stage_deadline_at: null,
      }),
    }
  );

  if (!patchRes.ok) {
    return res.status(500).json({ error: 'Failed to save video URL' });
  }

  const supabaseProjectRef = process.env.SUPABASE_URL
    .replace('https://', '')
    .replace('.supabase.co', '');

  const edgeRes = await fetch(
    `https://${supabaseProjectRef}.supabase.co/functions/v1/process-declaration`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ application_id: application.id }),
    }
  );

  if (!edgeRes.ok) {
    console.error('[declare-submit] process-declaration call failed:',
      await edgeRes.text());
    // Declaration was recorded. Non-fatal — return success to form.
    // Staff alert to be added in V2.
  }

  return res.status(200).json({ success: true });
}
