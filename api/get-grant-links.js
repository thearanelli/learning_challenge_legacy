// api/get-grant-links.js
// Fetches fresh BoldSign embedded signing links for a youth at grant_pending.
// Called by forms/grant/index.html after token validation.
// Token validation mirrors check-youth-token.js.

function isTokenValid(youth, token) {
  if (!youth.access_token || youth.access_token !== token) return false;
  if (!youth.token_expires_at) return false;
  return new Date(youth.token_expires_at) > new Date();
}

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['http://localhost:8080', 'https://learning-challenge-legacy.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Missing token' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const boldSignApiKey = process.env.BOLDSIGN_API_KEY;

  if (!supabaseUrl || !supabaseKey || !boldSignApiKey) {
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  try {
    // 1. Look up youth by access_token
    const youthRes = await fetch(
      `${supabaseUrl}/rest/v1/youth?access_token=eq.${encodeURIComponent(token)}&select=id,first_name,email,status,access_token,token_expires_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!youthRes.ok) {
      return res.status(500).json({ valid: false, error: 'Database error' });
    }

    const rows = await youthRes.json();
    if (!rows.length) {
      return res.status(200).json({ valid: false, error: 'Token not found' });
    }

    const youth = rows[0];

    if (!isTokenValid(youth, token)) {
      return res.status(200).json({ valid: false, error: 'Token expired' });
    }

    // 2. Confirm status = grant_pending; if not, docs already received
    if (youth.status !== 'grant_pending') {
      return res.status(200).json({ valid: false, signed: true });
    }

    // 3. Look up grant_requests row
    const grantRes = await fetch(
      `${supabaseUrl}/rest/v1/grant_requests?youth_id=eq.${encodeURIComponent(youth.id)}&select=boldsign_w9_id,boldsign_agreement_id&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!grantRes.ok) {
      return res.status(500).json({ valid: false, error: 'Database error' });
    }

    const grantRows = await grantRes.json();
    if (!grantRows.length) {
      return res.status(200).json({ valid: false, error: 'Grant request not found' });
    }

    const grantRequest = grantRows[0];

    // 4. Confirm BoldSign doc IDs exist
    if (!grantRequest.boldsign_w9_id || !grantRequest.boldsign_agreement_id) {
      return res.status(200).json({ valid: false, error: 'Documents not yet created' });
    }

    // 5. Fetch fresh embedded signing links from BoldSign
    const signerEmail = encodeURIComponent(youth.email);
    const linkValidTill = 21;

    const [w9LinkRes, agreementLinkRes] = await Promise.all([
      fetch(
        `https://api.boldsign.com/v1/document/getEmbeddedSignLink?documentId=${grantRequest.boldsign_w9_id}&signerEmail=${signerEmail}&linkValidTill=${linkValidTill}`,
        { headers: { 'X-API-KEY': boldSignApiKey } }
      ),
      fetch(
        `https://api.boldsign.com/v1/document/getEmbeddedSignLink?documentId=${grantRequest.boldsign_agreement_id}&signerEmail=${signerEmail}&linkValidTill=${linkValidTill}`,
        { headers: { 'X-API-KEY': boldSignApiKey } }
      ),
    ]);

    if (!w9LinkRes.ok || !agreementLinkRes.ok) {
      console.error(`[get-grant-links] BoldSign error — w9: ${w9LinkRes.status}, agreement: ${agreementLinkRes.status}`);
      return res.status(200).json({ valid: false, error: 'Failed to fetch signing links' });
    }

    const w9_link = (await w9LinkRes.json()).signLink;
    const agreement_link = (await agreementLinkRes.json()).signLink;

    if (!w9_link || !agreement_link) {
      return res.status(200).json({ valid: false, error: 'Signing links not available' });
    }

    return res.status(200).json({ valid: true, w9_link, agreement_link, first_name: youth.first_name });

  } catch (err) {
    console.error('[get-grant-links] error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
}
