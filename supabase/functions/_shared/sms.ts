const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') ?? '';

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('[SMS] Missing Twilio credentials — SMS not sent');
    return { success: false, error: 'Missing Twilio credentials' };
  }

  if (!to) {
    console.error('[SMS] No recipient phone number — SMS not sent');
    return { success: false, error: 'No recipient phone number' };
  }

  // Normalize phone number — ensure E.164 format
  const normalizedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: normalizedTo,
        Body: body,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[SMS] Twilio error ${response.status}: ${data.message ?? JSON.stringify(data)}`);
      return { success: false, error: data.message ?? 'Twilio API error' };
    }

    console.log(`[SMS] Sent to ${normalizedTo} — SID: ${data.sid}`);
    return { success: true, sid: data.sid };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SMS] Network error: ${message}`);
    return { success: false, error: message };
  }
}
