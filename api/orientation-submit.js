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
      return res.status(200).json({ success: false, error: 'invalid_token' });
    }

    const champion_id = champRows[0].id;

    // Validate youth belongs to this champion
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?id=eq.${youth_id}&champion_id=eq.${champion_id}&select=id,status,orientation_call_completed_at`,
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

    // Guard: orientation can only be submitted while youth is mentor_pending
    if (youth.status !== 'mentor_pending') {
      return res.status(200).json({
        success: false,
        error: 'already_submitted',
        message: 'It looks like an orientation form has already been submitted for this challenger. If you selected the wrong person from the dropdown, or if you think this is an error, please screenshot your completed form and email thea@griptape.org and we will sort it out.',
      });
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

    // Call process-orientation to advance status to grant_pending.
    // Non-fatal: orientation data is saved — staff can manually trigger if this fails.
    const supabaseProjectRef = process.env.SUPABASE_URL
      .replace('https://', '')
      .replace('.supabase.co', '');

    const edgeRes = await fetch(
      `https://${supabaseProjectRef}.supabase.co/functions/v1/process-orientation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ youth_id }),
      }
    );

    if (!edgeRes.ok) {
      console.error('[orientation-submit] process-orientation call failed:', await edgeRes.text());
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[orientation-submit] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
