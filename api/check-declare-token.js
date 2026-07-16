// api/check-declare-token.js
// Gates forms/declare/index.html on load.
// Valid status: declaration_pending only.
// Validates token match AND deadline expiry via isTokenValid.
// Future stage forms (meeting, grant) should have their own check-token files
// following this same pattern — do not make this file generic.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(application, token) {
  if (!application.access_token || application.access_token !== token) return false;
  if (!application.stage_deadline_at) return false;
  return new Date(application.stage_deadline_at) > new Date();
}

async function logEvent(supabaseUrl, supabaseKey, applicationId, firstName, properties, userAgent) {
  try {
    const device = /mobile|android|iphone|ipad|ipod/i.test(userAgent || '') ? 'mobile' : 'desktop';
    const entry = {
      ...properties,
      device,
      completed: false,
      ts: new Date().toISOString(),
    };

    // Try to append to existing row
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/analytics_events?application_id=eq.${applicationId}&select=id,activity`,
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
        `${supabaseUrl}/rest/v1/analytics_events?application_id=eq.${applicationId}`,
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
    } else {
      await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          first_name: firstName,
          activity: [entry],
        }),
      });
    }
  } catch (err) {
    console.error('[logEvent] failed:', err.message);
  }
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  const src = req.query.src ?? null;
  const channel = src?.includes('_email') ? 'email' : src?.includes('_sms') ? 'sms' : null;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,last_name,passion,city,state,screening_status,access_token,stage_deadline_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ valid: false });
    }

    const application = rows[0];
    const validStatuses = ['declaration_pending'];

    const userAgent = req.headers['user-agent'] || '';

    if (!validStatuses.includes(application.screening_status)) {
      await logEvent(supabaseUrl, supabaseKey, application.id, application.first_name, { page: 'declare', check_result: 'invalid_status', src, channel }, userAgent);
      return res.status(200).json({ valid: false });
    }

    if (!isTokenValid(application, token)) {
      await logEvent(supabaseUrl, supabaseKey, application.id, application.first_name, { page: 'declare', check_result: 'expired', src, channel }, userAgent);
      return res.status(200).json({ valid: false, expired: true });
    }

    let challengerNumber = null;
    try {
      const countRes = await fetch(
        `${supabaseUrl}/rest/v1/youth?select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'count=exact',
            'Range-Unit': 'items',
            'Range': '0-0',
          },
        }
      );
      const contentRange = countRes.headers.get('content-range');
      const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : null;
      challengerNumber = total !== null && !isNaN(total) ? total + 1 : null;
    } catch (err) {
      console.error('[check-declare-token] challenger count error:', err.message);
    }

    await logEvent(supabaseUrl, supabaseKey, application.id, application.first_name, { page: 'declare', check_result: 'valid', src, channel }, userAgent);
    return res.status(200).json({ valid: true, first_name: application.first_name, passion: application.passion, challenger_number: challengerNumber, last_initial: application.last_name ? application.last_name.charAt(0).toUpperCase() : '', city: application.city || '', state: application.state || '', application_id: application.id });

  } catch (err) {
    console.error('[check-token] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
