// api/champion-unflag-unresponsive.js
// POST handler — clears the unresponsive flag for a youth.
// Deletes the unresponsive row from champion_checkins and notifies staff.

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://thelearningchallenge.org', 'https://learning-challenge-legacy.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, youth_id } = req.body;
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
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id,first_name,last_name`,
      { headers }
    );
    if (!champRes.ok) return res.status(500).json({ error: 'Database error' });
    const champRows = await champRes.json();
    if (!champRows.length) return res.status(403).json({ error: 'Invalid token' });

    const champion_id = champRows[0].id;
    const champion_name = `${champRows[0].first_name} ${champRows[0].last_name}`;

    // Delete by youth_id + champion_id + type — no row ID needed
    const deleteRes = await fetch(
      `${supabaseUrl}/rest/v1/champion_checkins?youth_id=eq.${encodeURIComponent(youth_id)}&champion_id=eq.${encodeURIComponent(champion_id)}&type=eq.unresponsive`,
      { method: 'DELETE', headers }
    );

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error('[champion-unflag-unresponsive] delete error:', errText);
      return res.status(500).json({ error: 'Failed to unflag' });
    }

    // Notify staff
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
            subject: `Unresponsive flag cleared — youth ${youth_id}`,
            html: `<p><strong>${champion_name}</strong> has cleared the unresponsive flag for youth <strong>${youth_id}</strong>.</p>`,
          }),
        });
      } catch (emailErr) {
        console.error('[champion-unflag-unresponsive] email error:', emailErr);
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[champion-unflag-unresponsive] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
