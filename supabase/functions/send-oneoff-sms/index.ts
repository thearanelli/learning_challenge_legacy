// OWNER: nothing — deliberately outside the pipeline.
// One-off SMS/MMS blasts (e.g. LC Nights invites), invoked manually only.
// NO database access, NO status transitions, NO comms_log writes, NO cron.
// Guard: x-blast-secret header must match ONEOFF_SMS_SECRET env (fails closed
// with 503 if the secret is unset). Hard cap: 50 recipients per call.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendSMS } from '../_shared/sms.ts';

const MAX_RECIPIENTS = 50;

serve(async (req) => {
  try {
    const secret = Deno.env.get('ONEOFF_SMS_SECRET');
    if (!secret) {
      console.error('[send-oneoff-sms] ONEOFF_SMS_SECRET not set — refusing all requests');
      return new Response('Locked: secret not configured', { status: 503 });
    }
    if (req.headers.get('x-blast-secret') !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (req.method !== 'POST') {
      return new Response('POST only', { status: 405 });
    }

    const { to, body, media_url } = await req.json();

    if (!body || typeof body !== 'string' || !body.trim()) {
      return new Response('Missing body', { status: 400 });
    }

    const list = (Array.isArray(to) ? to : [to])
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim());
    const recipients = [...new Set(list)];

    if (recipients.length === 0) {
      return new Response('Missing to', { status: 400 });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return new Response(`Too many recipients (${recipients.length} > ${MAX_RECIPIENTS})`, { status: 400 });
    }
    if (media_url !== undefined && !/^https:\/\//.test(String(media_url))) {
      return new Response('media_url must be https', { status: 400 });
    }

    const results = [];
    for (const recipient of recipients) {
      const result = await sendSMS({ to: recipient, body, mediaUrl: media_url });
      results.push({ to: recipient, ...result });
    }

    const sent = results.filter((r) => r.success).length;
    console.log(`[send-oneoff-sms] ${sent}/${recipients.length} sent${media_url ? ' (MMS)' : ''}`);

    return new Response(
      JSON.stringify({ sent, failed: recipients.length - sent, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[send-oneoff-sms] Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
