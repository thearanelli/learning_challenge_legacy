// api/orientation-submit.js
// Receives { token, youth_id, responses }, writes to the youth record.
// token gates to champion identity — champion must own the youth_id.
// Idempotent: returns { already_submitted: true } if orientation_call_completed_at is already set.
// Does not call advance_status() — status transition is handled separately.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, youth_id, responses } = req.body;
  if (!token || !youth_id || !responses) {
    return res.status(400).json({ error: 'Missing token, youth_id, or responses' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Validate champion token
    const champRes = await fetch(
      `${supabaseUrl}/rest/v1/champions?champion_token=eq.${encodeURIComponent(token)}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!champRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const champRows = await champRes.json();
    if (!champRows.length) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const champion_id = champRows[0].id;

    // Validate youth belongs to this champion
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?id=eq.${youth_id}&champion_id=eq.${champion_id}&select=id,orientation_call_completed_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!youthRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const youthRows = await youthRes.json();
    if (!youthRows.length) {
      return res.status(403).json({ error: 'Youth not assigned to this champion' });
    }

    const youth = youthRows[0];

    // Idempotency: already submitted
    if (youth.orientation_call_completed_at) {
      return res.status(200).json({ already_submitted: true });
    }

    // Write responses and timestamp
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?id=eq.${youth_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          orientation_responses:        responses,
          orientation_call_completed_at: new Date().toISOString(),
        }),
      }
    );

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Failed to save responses' });
    }

    console.log(`[orientation-submit] champion ${champion_id} submitted for youth ${youth_id}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[orientation-submit] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
