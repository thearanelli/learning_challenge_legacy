// api/validate-video.js
// Receives { token, video_url }, validates via YouTube oEmbed,
// updates applications table, and creates a youth record on success.

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

  try {
    // Look up application by access_token
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/applications?access_token=eq.${encodeURIComponent(token)}&select=*`,
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
      return res.status(404).json({ error: 'Invalid token' });
    }

    const application = rows[0];

    // Validate YouTube URL via oEmbed
    const oEmbedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(video_url)}&format=json`
    );

    if (oEmbedRes.ok) {
      // Valid — update application
      await fetch(
        `${supabaseUrl}/rest/v1/applications?id=eq.${application.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            video_url,
            screening_status: 'accepted',
          }),
        }
      );

      // Create youth record
      await fetch(
        `${supabaseUrl}/rest/v1/youth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            program_id: application.program_id,
            application_id: application.id,
            first_name: application.first_name,
            last_name: application.last_name,
            email: application.email,
            phone: application.phone,
            status: 'onboarding',
            accepted_at: new Date().toISOString(),
          }),
        }
      );

      return res.status(200).json({ success: true });
    } else {
      // Invalid video — flag for resubmission
      await fetch(
        `${supabaseUrl}/rest/v1/applications?id=eq.${application.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ screening_status: 'video_resubmit' }),
        }
      );

      return res.status(200).json({ success: false, error: 'invalid_video' });
    }
  } catch (err) {
    console.error('[validate-video] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
