// api/receipt-upload.js
// Accepts a file upload from the receipt upload form (forms/receipts/index.html).
// Token is read from query param: ?token=[access_token]
// File is received as base64-encoded JSON body: { file_base64, file_name, content_type }
// Uploads file to Supabase Storage bucket 'receipts' and inserts a receipts row.

// Token validation — mirrors isTokenValid in _shared/tokens.ts
// Cannot import directly — this is a Vercel Node function
function isTokenValid(youth, token) {
  if (!youth.access_token || youth.access_token !== token) return false;
  if (!youth.token_expires_at) return false;
  return new Date(youth.token_expires_at) > new Date();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const { file_base64, file_name, content_type } = req.body ?? {};
  if (!file_base64 || !file_name || !content_type) {
    return res.status(400).json({ error: 'Missing file_base64, file_name, or content_type' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Look up youth by access_token
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,last_name,program_id,access_token,token_expires_at`,
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
      return res.status(401).json({ error: 'Invalid token' });
    }

    const youth = rows[0];
    if (!isTokenValid(youth, token)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Build storage path
    const ext = file_name.includes('.') ? file_name.split('.').pop() : 'bin';
    const safeName = `${youth.first_name}_${youth.last_name}_${Date.now()}.${ext}`;
    const filePath = `${youth.id}/${safeName}`;

    // Decode base64 to binary
    const fileBuffer = Buffer.from(file_base64, 'base64');

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/receipts/${filePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': content_type,
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[receipt-upload] Storage upload failed:', err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    const file_url = `${supabaseUrl}/storage/v1/object/receipts/${filePath}`;

    // Insert receipts row
    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/receipts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          program_id:  youth.program_id,
          youth_id:    youth.id,
          first_name:  youth.first_name,
          last_name:   youth.last_name,
          file_url,
          uploaded_at: new Date().toISOString(),
        }),
      }
    );

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('[receipt-upload] receipts insert failed:', err);
      return res.status(500).json({ error: 'Failed to record receipt' });
    }

    return res.status(200).json({ success: true, file_url });

  } catch (err) {
    console.error('[receipt-upload] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
