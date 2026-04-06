// api/submit.js
// Vercel serverless function — writes to Supabase only.
// All secrets from Vercel environment variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { fields } = req.body;
  if (!fields) {
    return res.status(400).json({ error: 'Missing fields in request body' });
  }
  const required = ['first_name', 'last_name', 'birthdate', 'address', 'email', 'phone'];
  for (const f of required) {
    if (!fields[f]) {
      return res.status(400).json({ error: `Missing required field: ${f}` });
    }
  }
  try {
    const record = await writeToSupabase(fields);
    return res.status(200).json({ id: record.id });
  } catch (err) {
    console.error('Supabase submission error:', err);
    return res.status(500).json({ error: err.message || 'Submission failed' });
  }
}

async function writeToSupabase(fields) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }
  const payload = {
    first_name:            String(fields.first_name).trim(),
    last_name:             String(fields.last_name).trim(),
    birthdate:             String(fields.birthdate).trim(),
    address:               String(fields.address).trim(),
    email:                 String(fields.email).trim().toLowerCase(),
    phone:                 String(fields.phone).trim(),
    screening_status:      'submitted',
    submitted_at:          new Date().toISOString(),
    application_responses: fields.application_responses || {},
  };
  const response = await fetch(`${supabaseUrl}/rest/v1/applications`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  return data[0];
}
