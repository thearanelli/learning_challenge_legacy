// api/help-submit.js
// Public endpoint — no auth required.
// Receives help request form submissions and forwards to staff via email.
// No Supabase writes. No Edge Function calls. Intentionally simple.

export default async function handler(req, res) {
  console.log('[help-submit] received request');

  if (req.method !== 'POST') {
    console.error('[help-submit] wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, contact, role, message } = req.body;
  if (!name?.trim() || !contact?.trim() || !role?.trim() || !message?.trim()) {
    console.error('[help-submit] missing fields — name:', !!name, 'contact:', !!contact, 'role:', !!role, 'message:', !!message);
    return res.status(200).json({ success: false, error: 'missing_fields' });
  }
  console.log('[help-submit] fields validated');

  const resendKey  = process.env.RESEND_API_KEY;
  const staffEmail = process.env.STAFF_EMAIL;
  const emailFrom  = process.env.EMAIL_FROM;

  if (!resendKey || !staffEmail || !emailFrom) {
    console.error('[help-submit] missing env vars — RESEND_API_KEY:', !!resendKey, 'STAFF_EMAIL:', !!staffEmail, 'EMAIL_FROM:', !!emailFrom);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log('[help-submit] calling Resend');
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: staffEmail,
        subject: `GripTape help request — ${role}: ${name}`,
        text: `Name: ${name}\nContact: ${contact}\nRole: ${role}\nMessage: ${message}\nSubmitted: ${new Date().toISOString()}`,
      }),
    });

    const resendBody = await emailRes.text();
    console.log('[help-submit] Resend response:', emailRes.status, resendBody);

    if (!emailRes.ok) {
      console.error('[help-submit] Resend error:', emailRes.status, resendBody);
      return res.status(200).json({ success: false, error: 'send_failed' });
    }

    console.log(`[help-submit] success — help request from ${role}: ${name}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[help-submit] caught exception:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
