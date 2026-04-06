// Twilio SMS wrapper — STUBBED
// Replace with Twilio implementation when TWILIO_ACCOUNT_SID is configured

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  console.log(`[SMS STUB] To: ${to} | Body: ${body}`);
  return { stub: true };
}
