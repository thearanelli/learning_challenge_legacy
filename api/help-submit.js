// api/help-submit.js
// Public endpoint — no auth required.
// Receives help request form submissions and forwards to staff via email.
// No Supabase writes. No Edge Function calls. Intentionally simple.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, contact, role, message } = req.body;
  if (!name?.trim() || !contact?.trim() || !role?.trim() || !message?.trim()) {
    return res.status(200).json({ success: false, error: 'missing_fields' });
  }

  const resendKey  = process.env.RESEND_API_KEY;
  const staffEmail = process.env.STAFF_EMAIL;
  const emailFrom  = process.env.EMAIL_FROM;

  if (!resendKey || !staffEmail || !emailFrom) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
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

    if (!emailRes.ok) {
      console.error('[help-submit] Resend error:', await emailRes.text());
      return res.status(200).json({ success: false, error: 'send_failed' });
    }

    console.log(`[help-submit] help request from ${role}: ${name}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[help-submit] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
