// api/end-of-challenge-submit.js
// Receives { token, youth_id, responses }, writes to the youth record.
// token gates to champion identity — champion must own the youth_id.
// Idempotent: returns { already_submitted: true } if end_of_challenge_completed_at is already set.
// Does not call advance_status() — no status change at EOC.

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://learning-challenge-legacy.vercel.app'];
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
      `${supabaseUrl}/rest/v1/youth?id=eq.${youth_id}&champion_id=eq.${champion_id}&select=id,status,end_of_challenge_completed_at,token_expires_at`,
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

    if (youth.end_of_challenge_completed_at) {
      return res.status(200).json({
        success: false,
        error: 'already_submitted',
        message: 'It looks like an End of Challenge form has already been submitted for this challenger. If you selected the wrong person from the dropdown, or if you think this is an error, please screenshot your completed form and email thea@griptape.org and we will sort it out.',
      });
    } else if (!youth.token_expires_at || new Date(youth.token_expires_at) < new Date()) {
      return res.status(200).json({
        success: false,
        error: 'deadline_passed',
        message: "The deadline for this challenger's End of Challenge has passed.",
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
          end_of_challenge_responses:    responses,
          end_of_challenge_completed_at: new Date().toISOString(),
        }),
      }
    );

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Failed to save responses' });
    }

    console.log(`[end-of-challenge-submit] champion ${champion_id} submitted for youth ${youth_id}`);

    // Fire and forget — do not await
    // Non-fatal: EOC data is saved — staff can manually trigger if this fails.
    const supabaseProjectRef = process.env.SUPABASE_URL
      .replace('https://', '')
      .replace('.supabase.co', '');

    fetch(
      `https://${supabaseProjectRef}.supabase.co/functions/v1/process-end-of-challenge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ youth_id }),
      }
    ).catch(err => console.error('[end-of-challenge-submit] process-end-of-challenge call failed:', err));

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[end-of-challenge-submit] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
