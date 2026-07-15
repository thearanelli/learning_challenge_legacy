// api/champion-flag-unresponsive.js
// POST handler — flags a youth as unresponsive.
// Inserts into champion_checkins and emails staff via Resend.

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

  const { token, youth_id, youth_name, champion_name } = req.body;
  if (!token || !youth_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const staffEmail  = process.env.STAFF_EMAIL;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    // Validate champion token
    const champRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id`,
      { headers }
    );

    if (!champRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const champRows = await champRes.json();
    if (!champRows.length) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const champion_id = champRows[0].id;
    const today = new Date().toISOString().slice(0, 10);

    // Insert unresponsive checkin
    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/champion_checkins`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          youth_id,
          champion_id,
          youth_name: youth_name || null,
          champion_name: champion_name || null,
          type: 'unresponsive',
          call_date: today,
          note: 'Flagged as unresponsive by champion',
        }),
      }
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[champion-flag-unresponsive] insert error:', errText);
      return res.status(500).json({ error: 'Failed to flag' });
    }

    // Send email to staff via Resend
    if (resendKey && staffEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'GripTape <hello@griptape.org>',
            to: staffEmail,
            subject: `Challenger flagged as unresponsive — ${youth_name || 'Unknown'}`,
            html: `<p><strong>${champion_name || 'A champion'}</strong> has flagged <strong>${youth_name || 'a Challenger'}</strong> as unresponsive.</p><p>Check in with this Challenger directly and review their current stage in Supabase.</p>`,
          }),
        });
      } catch (emailErr) {
        console.error('[champion-flag-unresponsive] email error:', emailErr);
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[champion-flag-unresponsive] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
